import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { auth } from "../middleware/auth.js";
import type { Env, User } from "../types.js";
import { authRoutes } from "./auth.js";

const testUser: User = {
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  avatar_url: null,
  api_token: "tome_abc123",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

function mockDb(options: { user?: User | null } = {}) {
  const user = options.user === undefined ? testUser : options.user;
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(user),
        all: vi.fn().mockResolvedValue({ results: user ? [user] : [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    }),
  } as unknown as D1Database;
}

function makeEnv(db: D1Database, overrides: Partial<Env> = {}) {
  return {
    TOME_DB: db,
    GITHUB_CLIENT_ID: "gh_test",
    GITHUB_CLIENT_SECRET: "gh_secret",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    ...overrides,
  } as Env;
}

function makeApp() {
  const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();
  app.use("/me", auth);
  app.route("/", authRoutes);
  return app;
}

describe("auth routes", () => {
  describe("GET /providers", () => {
    it("returns GitHub when GITHUB_CLIENT_ID is set", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb(), {
        GITHUB_CLIENT_ID: "gh_test",
      } as Partial<Env>);
      const res = await app.request("/providers", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.providers).toHaveLength(1);
      expect(body.providers[0].id).toBe("github");
      expect(body.providers[0].authorizeUrl).toContain(
        "github.com/login/oauth/authorize"
      );
    });

    it("returns both providers when both are configured", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb(), {
        GITHUB_CLIENT_ID: "gh_test",
        GOOGLE_CLIENT_ID: "ggl_test",
      } as Partial<Env>);
      const res = await app.request("/providers", {}, env);
      const body = (await res.json()) as any;
      expect(body.providers).toHaveLength(2);
      expect(body.providers.map((p: any) => p.id)).toEqual([
        "github",
        "google",
      ]);
    });

    it("returns empty providers when none configured", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb(), {
        GITHUB_CLIENT_ID: "",
        GOOGLE_CLIENT_ID: "",
      } as Partial<Env>);
      const res = await app.request("/providers", {}, env);
      const body = (await res.json()) as any;
      expect(body.providers).toHaveLength(0);
    });
  });

  describe("POST /token", () => {
    it("validates a valid token", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "tome_abc123" }),
        },
        env
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.token).toBe("tome_abc123");
      expect(body.email).toBe("test@example.com");
    });

    it("rejects missing token with 400", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("rejects invalid format token with 400", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "not_a_tome_token" }),
        },
        env
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain("Invalid token format");
    });

    it("rejects valid format but unknown token with 401", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb({ user: null }));
      const res = await app.request(
        "/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "tome_unknown" }),
        },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /me", () => {
    it("returns user info when authenticated", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/me",
        {
          headers: { Authorization: "Bearer tome_abc123" },
        },
        env
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.email).toBe("test@example.com");
    });

    it("returns 401 when not authenticated", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb({ user: null }));
      const res = await app.request("/me", {}, env);
      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid token", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb({ user: null }));
      const res = await app.request(
        "/me",
        {
          headers: { Authorization: "Bearer invalid" },
        },
        env
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /oauth/callback", () => {
    it("rejects missing provider or code", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/oauth/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "", code: "" }),
        },
        env
      );
      expect(res.status).toBe(400);
    });

    it("rejects unknown provider", async () => {
      const app = makeApp();
      const env = makeEnv(mockDb());
      const res = await app.request(
        "/oauth/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "twitter",
            code: "abc",
            redirectUri: "http://localhost",
          }),
        },
        env
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain("Unknown provider");
    });
  });
});
