import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env, User } from "../types.js";
import { domains } from "./domains.js";

const communityUser: User = {
  id: "u1",
  email: "test@example.com",
  name: "Test",
  avatar_url: null,
  api_token: "tome_abc",
  stripe_customer_id: null,
  plan: "community",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

const cloudUser: User = { ...communityUser, plan: "cloud" };
const teamUser: User = { ...communityUser, plan: "team" };

function mockDb(
  overrides: {
    domainCount?: number;
    project?: { id: string } | null;
    existingDomain?: Record<string, unknown> | null;
    domainRow?: Record<string, unknown> | null;
  } = {}
) {
  const {
    domainCount = 0,
    project = { id: "proj1" },
    existingDomain = null,
    domainRow = null,
  } = overrides;

  return {
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(() => {
          if (sql.includes("COUNT(*)")) {
            return Promise.resolve({ count: domainCount });
          }
          if (sql.includes("SELECT id FROM projects")) {
            return Promise.resolve(project);
          }
          if (sql.includes("SELECT id FROM domains")) {
            return Promise.resolve(existingDomain);
          }
          if (
            sql.includes("SELECT d.id") &&
            sql.includes("cloudflare_hostname_id")
          ) {
            return Promise.resolve(domainRow);
          }
          if (sql.includes("SELECT d.*")) {
            return Promise.resolve(domainRow);
          }
          return Promise.resolve(null);
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    })),
  } as unknown as D1Database;
}

function makeApp(user: User) {
  const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/", domains);
  return app;
}

function makeEnv(db?: D1Database) {
  return {
    TOME_DB: db ?? mockDb(),
    CLOUDFLARE_API_TOKEN: "cf_test",
    CLOUDFLARE_ZONE_ID: "zone_test",
  } as Env;
}

// Mock global fetch for Cloudflare API calls
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ result: { id: "cf_hostname_1" } }),
});
vi.stubGlobal("fetch", mockFetch);

describe("domain routes", () => {
  describe("POST /", () => {
    it("blocks community users from adding domains", async () => {
      const app = makeApp(communityUser);
      const env = makeEnv();
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs.acme.io",
            projectSlug: "my-docs",
          }),
        },
        env
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body.error).toContain("Cloud plan or higher");
      expect(body.requiredPlan).toBe("cloud");
    });

    it("allows cloud users to add a domain", async () => {
      const db = mockDb();
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs.acme.io",
            projectSlug: "my-docs",
          }),
        },
        env
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.domain).toBe("docs.acme.io");
      expect(body.verified).toBe(false);
      expect(body.dnsRecords).toHaveLength(2);
    });

    it("blocks cloud users who already have max domains", async () => {
      const db = mockDb({ domainCount: 1 }); // cloud limit is 1
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs2.acme.io",
            projectSlug: "my-docs",
          }),
        },
        env
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as any;
      expect(body.error).toContain("Domain limit reached");
    });

    it("allows team users unlimited domains", async () => {
      const db = mockDb({ domainCount: 50 });
      const app = makeApp(teamUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs.acme.io",
            projectSlug: "my-docs",
          }),
        },
        env
      );
      expect(res.status).toBe(200);
    });

    it("rejects missing domain or project slug", async () => {
      const app = makeApp(cloudUser);
      const env = makeEnv();
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent project", async () => {
      const db = mockDb({ project: null });
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs.acme.io",
            projectSlug: "nonexistent",
          }),
        },
        env
      );
      expect(res.status).toBe(404);
    });

    it("returns 409 for already-registered domain", async () => {
      const db = mockDb({ existingDomain: { id: "existing" } });
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: "docs.acme.io",
            projectSlug: "my-docs",
          }),
        },
        env
      );
      expect(res.status).toBe(409);
    });
  });

  describe("GET /", () => {
    it("returns empty array when no domains", async () => {
      const app = makeApp(cloudUser);
      const env = makeEnv();
      const res = await app.request("/", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe("DELETE /:domain", () => {
    it("returns 404 when domain not found", async () => {
      const db = mockDb({ domainRow: null });
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/docs.acme.io",
        {
          method: "DELETE",
        },
        env
      );
      expect(res.status).toBe(404);
    });

    it("removes domain and returns success", async () => {
      const db = mockDb({
        domainRow: { id: "dom1", cloudflare_hostname_id: "cf1" },
      });
      const app = makeApp(cloudUser);
      const env = makeEnv(db);
      const res = await app.request(
        "/docs.acme.io",
        {
          method: "DELETE",
        },
        env
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.removed).toBe(true);
    });
  });
});
