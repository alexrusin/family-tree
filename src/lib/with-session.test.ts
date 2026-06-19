import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DomainError } from "./domain-error";

const getSessionMock = vi.hoisted(() => vi.fn());
const prismaStub = vi.hoisted(() => ({ __stub: true }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaStub }));

const { withSession } = await import("./with-session");

function makeRequest() {
  return new NextRequest("http://localhost/api/test", { method: "POST" });
}

describe("withSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with errorCode when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withSession(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ errorCode: "ERR_UNAUTHORIZED" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("maps a thrown DomainError to the correct status and errorCode", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const handler = vi.fn().mockRejectedValue(new DomainError("ERR_TREE_NAME_REQUIRED"));
    const wrapped = withSession(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ errorCode: "ERR_TREE_NAME_REQUIRED" });
  });

  it("returns 500 and logs for non-DomainError throws", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = vi.fn().mockRejectedValue(new Error("kaboom"));
    const wrapped = withSession(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ errorCode: "ERR_INTERNAL" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Unhandled error in route handler:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("passes prisma, user, and request to the handler and returns its response", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const handler = vi.fn().mockImplementation(async (ctx) => {
      expect(ctx.prisma).toBe(prismaStub);
      expect(ctx.user).toEqual({ id: "u1" });
      expect(ctx.request).toBeInstanceOf(NextRequest);
      return Response.json({ ok: true }, { status: 200 });
    });

    const wrapped = withSession(handler);
    const res = await wrapped(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledOnce();
  });
});
