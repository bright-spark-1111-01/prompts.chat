import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUser } from "@/lib/api-auth";
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a 401 response when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const { session, response } = await requireUser();

    expect(session).toBeUndefined();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a 401 response when the session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    const { response } = await requireUser();

    expect(response?.status).toBe(401);
  });

  it("supports a custom unauthorized message", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const { response } = await requireUser("nope");

    await expect(response?.json()).resolves.toEqual({ error: "nope" });
  });

  it("returns the session when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);

    const { session, response } = await requireUser();

    expect(response).toBeUndefined();
    expect(session?.user.id).toBe("user1");
  });
});
