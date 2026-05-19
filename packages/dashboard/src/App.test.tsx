import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

// ── Helpers ────────────────────────────────────────────────

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  plan: "community",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockProjects = [
  {
    id: "proj-1",
    slug: "my-docs",
    name: "my-docs",
    deployStatus: "live",
    lastDeployAt: new Date().toISOString(),
    fileCount: 12,
    totalSize: 51_200,
    url: "https://my-docs.tome.center",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const mockDeployments = [
  {
    id: "dep-1-full-uuid",
    status: "live",
    fileCount: 12,
    totalSize: 51_200,
    createdAt: "2026-03-09T10:00:00Z",
    finalizedAt: "2026-03-09T10:01:00Z",
    url: "https://my-docs.tome.center",
  },
];

const mockProviders = [
  {
    id: "github",
    name: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize?test=1",
  },
  {
    id: "google",
    name: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/auth?test=1",
  },
];

function mockFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (url: string, opts?: RequestInit) => {
    const path = new URL(url).pathname;
    const method = opts?.method ?? "GET";

    if (method === "GET" && path === "/api/auth/providers") {
      return Response.json({
        providers: overrides.providers ?? mockProviders,
        emailEnabled: false,
      });
    }
    if (method === "POST" && path === "/api/auth/oauth/callback") {
      return Response.json({
        token: "tome_test123",
        userId: "user-1",
        email: "test@example.com",
      });
    }
    if (method === "GET" && path === "/api/auth/me") {
      if (overrides.authFail) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      }
      return Response.json(mockUser);
    }
    if (method === "GET" && path === "/api/deploy/projects") {
      return Response.json(overrides.projects ?? mockProjects);
    }
    if (
      method === "GET" &&
      path.match(/\/api\/deploy\/projects\/[\w-]+\/deployments/)
    ) {
      return Response.json(overrides.deployments ?? mockDeployments);
    }
    if (
      method === "GET" &&
      (path === "/api/domains" || path === "/api/domains/")
    ) {
      return Response.json(overrides.domains ?? []);
    }
    if (
      method === "POST" &&
      (path === "/api/domains" || path === "/api/domains/")
    ) {
      return Response.json({
        domain: "docs.example.com",
        verified: false,
        sslStatus: "pending",
        dnsRecords: [],
      });
    }
    if (method === "GET" && path === "/api/analytics/summary") {
      return Response.json(
        overrides.analytics ?? {
          totalPageViews: 0,
          uniqueVisitors: 0,
          topPages: [],
          topReferrers: [],
          viewsByDay: [],
        }
      );
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
    });
  }) as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dashboard");
  vi.restoreAllMocks();
});

// ── Login Page ─────────────────────────────────────────────

describe("Login", () => {
  it("renders OAuth provider buttons when no token stored", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    });
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("shows sign-in page text", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching providers", async () => {
    let resolveProviders: (v: Response) => void;
    const slowFetch = vi.fn((url: string) => {
      const path = new URL(url).pathname;
      if (path === "/api/auth/providers") {
        return new Promise<Response>((r) => {
          resolveProviders = r;
        });
      }
      return mockFetch()(url);
    }) as typeof fetch;
    vi.stubGlobal("fetch", slowFetch);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    resolveProviders!(
      Response.json({ providers: mockProviders, emailEnabled: false })
    );
  });

  it("shows fallback when no providers available", async () => {
    vi.stubGlobal("fetch", mockFetch({ providers: [] }));
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(/No sign-in providers available/)
      ).toBeInTheDocument();
    });
  });

  it("redirects to login when token is invalid", async () => {
    localStorage.setItem("tome_token", "tome_invalid");
    vi.stubGlobal("fetch", mockFetch({ authFail: true }));
    render(<App />);
    await waitFor(() => {
      expect(localStorage.getItem("tome_token")).toBeNull();
    });
  });
});

// ── Projects Page ──────────────────────────────────────────

describe("Projects", () => {
  it("renders project list after auth", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("my-docs")).toBeInTheDocument();
    });
    // Status badge shows uppercase
    expect(screen.getByText("live")).toBeInTheDocument();
    // Stats show as separate label + value
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows empty state when no projects", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    vi.stubGlobal("fetch", mockFetch({ projects: [] }));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
    });
  });

  it("renders Your Projects heading with description", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Your Projects")).toBeInTheDocument();
    });
  });
});

// ── Project Detail ─────────────────────────────────────────

describe("Project Detail", () => {
  beforeEach(() => {
    localStorage.setItem("tome_token", "tome_test123");
    window.history.replaceState(null, "", "/dashboard/project/my-docs");
  });

  it("renders deployment history", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("dep-1-full-u")).toBeInTheDocument(); // 12-char truncated ID
    });
    expect(screen.getByText("Deployments")).toBeInTheDocument();
  });

  it("renders stat cards", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Current Status")).toBeInTheDocument();
    });
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("Total Size")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      // my-docs appears in breadcrumb and page title
      expect(screen.getAllByText("my-docs").length).toBeGreaterThanOrEqual(2);
    });
    // Projects appears in sidebar nav and breadcrumb
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(2);
  });

  it("renders analytics summary when data exists", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        analytics: {
          totalPageViews: 1500,
          uniqueVisitors: 320,
          topPages: [{ url: "/docs/api", views: 500 }],
          topReferrers: [],
          viewsByDay: [],
        },
      })
    );
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });
    expect(screen.getByText("320")).toBeInTheDocument();
    expect(screen.getByText("/docs/api")).toBeInTheDocument();
  });

  it("renders domain management section", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        domains: [
          {
            domain: "docs.acme.io",
            verified: true,
            sslStatus: "active",
            dnsRecords: [
              {
                type: "CNAME",
                name: "docs",
                value: "my-docs.tome.center",
                verified: true,
              },
            ],
          },
        ],
      })
    );
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("docs.acme.io")).toBeInTheDocument();
    });
    expect(screen.getByText("Verified & Active")).toBeInTheDocument();
  });
});

// ── Settings ───────────────────────────────────────────────

describe("Settings", () => {
  beforeEach(() => {
    localStorage.setItem("tome_token", "tome_test123");
    window.history.replaceState(null, "", "/dashboard/settings");
  });

  it("shows user email and account info", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Account Settings")).toBeInTheDocument();
    });
    expect(screen.getByText("Email Address")).toBeInTheDocument();
    expect(screen.getByText("Member Since")).toBeInTheDocument();
  });

  it("shows API credentials section", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("API Credentials")).toBeInTheDocument();
    });
  });

  it("shows API token with show/hide toggle", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Show")).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Show"));
    expect(screen.getByText("Hide")).toBeInTheDocument();
  });

  it("signs out and clears token", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });
    const user = userEvent.setup();
    await user.click(screen.getByText("Sign Out"));
    expect(localStorage.getItem("tome_token")).toBeNull();
  });
});

// ── Navigation ─────────────────────────────────────────────

describe("Navigation", () => {
  it("renders sidebar nav links when authenticated", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    vi.stubGlobal("fetch", mockFetch());
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});

// ── Responsive CSS ──────────────────────────────────────────

describe("Responsive layout", () => {
  it("applies responsive class names to layout elements", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    vi.stubGlobal("fetch", mockFetch());
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    // Sidebar layout uses dash-layout and dash-sidebar
    expect(container.querySelector(".dash-layout")).toBeInTheDocument();
    expect(container.querySelector(".dash-sidebar")).toBeInTheDocument();
    expect(container.querySelector(".dash-main")).toBeInTheDocument();
  });

  it("applies responsive class to settings grid", async () => {
    localStorage.setItem("tome_token", "tome_test123");
    window.history.replaceState(null, "", "/dashboard/settings");
    vi.stubGlobal("fetch", mockFetch());
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Account Settings")).toBeInTheDocument();
    });

    expect(container.querySelector(".dash-settings-grid")).toBeInTheDocument();
  });

  it("injects responsive CSS with media queries", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    const styleTag = container.closest("body")?.querySelector("style");
    expect(styleTag?.textContent).toContain("@media (max-width: 767px)");
    expect(styleTag?.textContent).toContain("@media (max-width: 480px)");
  });
});
