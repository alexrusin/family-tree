import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSessionMock = vi.hoisted(() => vi.fn());
const getTreeRoleMock = vi.hoisted(() => vi.fn());
const prismaStub = vi.hoisted(() => ({ __stub: true }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaStub }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
}));

const { withTreeRole } = await import("./with-tree-role");

function makeRequest() {
  return new NextRequest("http://localhost/api/trees/t1/members", {
    method: "GET",
  });
}

function makeParams(overrides: Record<string, string> = {}) {
  return { params: Promise.resolve({ treeId: "t1", ...overrides }) };
}

describe("withTreeRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withTreeRole("viewer", handler);
    const res = await wrapped(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ errorCode: "ERR_UNAUTHORIZED" });
    expect(handler).not.toHaveBeenCalled();
  });

  describe("viewer tier", () => {
    it("rejects none with 403", async () => {
      getTreeRoleMock.mockResolvedValue("none");

      const handler = vi.fn();
      const wrapped = withTreeRole("viewer", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("allows viewer", async () => {
      getTreeRoleMock.mockResolvedValue("viewer");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("viewer", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("allows editor", async () => {
      getTreeRoleMock.mockResolvedValue("editor");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("viewer", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("allows owner", async () => {
      getTreeRoleMock.mockResolvedValue("owner");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("viewer", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("editor tier", () => {
    it("rejects none with 403", async () => {
      getTreeRoleMock.mockResolvedValue("none");

      const handler = vi.fn();
      const wrapped = withTreeRole("editor", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
    });

    it("rejects viewer with 403", async () => {
      getTreeRoleMock.mockResolvedValue("viewer");

      const handler = vi.fn();
      const wrapped = withTreeRole("editor", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
    });

    it("allows editor", async () => {
      getTreeRoleMock.mockResolvedValue("editor");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("editor", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("allows owner", async () => {
      getTreeRoleMock.mockResolvedValue("owner");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("editor", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("owner tier", () => {
    it("rejects none with 403", async () => {
      getTreeRoleMock.mockResolvedValue("none");

      const handler = vi.fn();
      const wrapped = withTreeRole("owner", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
    });

    it("rejects viewer with 403", async () => {
      getTreeRoleMock.mockResolvedValue("viewer");

      const handler = vi.fn();
      const wrapped = withTreeRole("owner", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
    });

    it("rejects editor with 403", async () => {
      getTreeRoleMock.mockResolvedValue("editor");

      const handler = vi.fn();
      const wrapped = withTreeRole("owner", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ errorCode: "ERR_FORBIDDEN" });
    });

    it("allows owner", async () => {
      getTreeRoleMock.mockResolvedValue("owner");

      const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }));
      const wrapped = withTreeRole("owner", handler);
      const res = await wrapped(makeRequest(), makeParams());

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  it("passes prisma, user, request, role, and params to the handler", async () => {
    getTreeRoleMock.mockResolvedValue("editor");

    const handler = vi.fn().mockImplementation(async (ctx) => {
      expect(ctx.prisma).toBe(prismaStub);
      expect(ctx.user).toEqual({ id: "u1" });
      expect(ctx.request).toBeInstanceOf(NextRequest);
      expect(ctx.role).toBe("editor");
      expect(ctx.params).toEqual({ treeId: "t1" });
      return Response.json({ ok: true });
    });

    const wrapped = withTreeRole("viewer", handler);
    await wrapped(makeRequest(), makeParams());

    expect(handler).toHaveBeenCalledOnce();
  });

  it("resolves and exposes additional params", async () => {
    getTreeRoleMock.mockResolvedValue("owner");

    const handler = vi.fn().mockImplementation(async (ctx) => {
      expect(ctx.params).toEqual({ treeId: "t1", memberId: "m1" });
      return Response.json({ ok: true });
    });

    const wrapped = withTreeRole("viewer", handler);
    await wrapped(makeRequest(), makeParams({ memberId: "m1" }));

    expect(handler).toHaveBeenCalledOnce();
  });
});
