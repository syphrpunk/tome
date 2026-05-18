import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Env, User } from "../types.js";
import { requirePlan } from "./plan-gate.js";

function makeApp(minPlan: "cloud" | "team") {
  const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

  // Inject user from query param for testing
  app.use("*", async (c, next) => {
    const plan = c.req.query("plan") ?? "community";
    c.set("user", {
      id: "u1",
      email: "test@example.com",
      name: "Test",
      avatar_url: null,
      api_token: "tome_abc",
      stripe_customer_id: null,
      plan,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
    });
    await next();
  });

  app.use("*", requirePlan(minPlan));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

describe("requirePlan middleware", () => {
  describe("requirePlan('cloud')", () => {
    const app = makeApp("cloud");

    it("blocks community users with 403", async () => {
      const res = await app.request("/test?plan=community");
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Cloud plan or higher");
      expect(body.requiredPlan).toBe("cloud");
      expect(body.currentPlan).toBe("community");
    });

    it("allows cloud users", async () => {
      const res = await app.request("/test?plan=cloud");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it("allows team users", async () => {
      const res = await app.request("/test?plan=team");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });
  });

  describe("requirePlan('team')", () => {
    const app = makeApp("team");

    it("blocks community users with 403", async () => {
      const res = await app.request("/test?plan=community");
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.requiredPlan).toBe("team");
    });

    it("blocks cloud users with 403", async () => {
      const res = await app.request("/test?plan=cloud");
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.requiredPlan).toBe("team");
      expect(body.currentPlan).toBe("cloud");
    });

    it("allows team users", async () => {
      const res = await app.request("/test?plan=team");
      expect(res.status).toBe(200);
    });
  });

  it("treats unknown plans as community level", async () => {
    const app = makeApp("cloud");
    const res = await app.request("/test?plan=unknown");
    expect(res.status).toBe(403);
  });
});
