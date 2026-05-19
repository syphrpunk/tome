import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env, User } from "../types.js";
import { deploy } from "./deploy.js";

const communityUser: User = {
  id: "u1",
  email: "test@example.com",
  name: "Test",
  avatar_url: null,
  api_token: "tome_abc",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

const cloudUser: User = { ...communityUser };

function mockBucket() {
  return {
    head: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  } as unknown as R2Bucket;
}

function mockDb(
  overrides: {
    deployCount?: number;
    storageTotal?: number;
    project?: Record<string, unknown> | null;
  } = {}
) {
  const deployCount = overrides.deployCount ?? 0;
  const storageTotal = overrides.storageTotal ?? 0;
  const project = overrides.project ?? null;

  return {
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(() => {
          if (sql.includes("COUNT(*)") && sql.includes("deployments")) {
            return Promise.resolve({ count: deployCount });
          }
          if (sql.includes("SUM") && sql.includes("total_size")) {
            return Promise.resolve({ total: storageTotal });
          }
          if (sql.includes("SELECT") && sql.includes("projects")) {
            return Promise.resolve(project);
          }
          if (sql.includes("SELECT") && sql.includes("deployments")) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    })),
    batch: vi.fn().mockResolvedValue([]),
  } as unknown as D1Database;
}

function makeApp(user: User) {
  const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/", deploy);
  return app;
}

function makeEnv(db?: D1Database, bucket?: R2Bucket) {
  return {
    TOME_DB: db ?? mockDb(),
    TOME_BUCKET: bucket ?? mockBucket(),
  } as Env;
}

describe("deploy routes", () => {
  describe("POST /start", () => {
    it("rejects missing slug or files", async () => {
      const app = makeApp(communityUser);
      const env = makeEnv();
      const res = await app.request(
        "/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("creates a deployment for first-time deploy", async () => {
      const db = mockDb({ project: null });
      const app = makeApp(communityUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: "my-docs",
            files: { "index.html": "abc123", "style.css": "def456" },
          }),
        },
        env
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.deploymentId).toBeTruthy();
      expect(body.needed).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.skipped).toBe(0);
    });

    it("allows cloud plan unlimited deployments", async () => {
      const db = mockDb({ deployCount: 100, project: null });
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: "my-docs",
            files: { "index.html": "abc" },
          }),
        },
        env
      );
      expect(res.status).toBe(200);
    });
  });

  describe("POST /upload", () => {
    it("rejects missing deployment headers", async () => {
      const app = makeApp(communityUser);
      const env = makeEnv();
      const res = await app.request(
        "/upload",
        {
          method: "POST",
          body: "file-content",
        },
        env
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain("Missing deployment headers");
    });
  });

  describe("POST /finalize", () => {
    it("rejects missing deploymentId", async () => {
      const app = makeApp(communityUser);
      const env = makeEnv();
      const res = await app.request(
        "/finalize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown deployment", async () => {
      const app = makeApp(communityUser);
      const env = makeEnv();
      const res = await app.request(
        "/finalize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deploymentId: "nonexistent" }),
        },
        env
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /projects", () => {
    it("returns user projects", async () => {
      const db = mockDb();
      const app = makeApp(communityUser);
      const env = makeEnv(db);
      const res = await app.request("/projects", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("GET /projects/:slug/deployments", () => {
    it("returns deployment history", async () => {
      const db = mockDb();
      const app = makeApp(communityUser);
      const env = makeEnv(db);
      const res = await app.request("/projects/my-docs/deployments", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
