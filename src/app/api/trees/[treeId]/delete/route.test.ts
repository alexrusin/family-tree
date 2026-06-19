import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  getTreeRoleMock,
  prismaMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  };

  return { getSessionMock, getTreeRoleMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
}));

const { DELETE } = await import("./route");

describe("DELETE /api/trees/[treeId]/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    getTreeRoleMock.mockResolvedValue("owner");
  });

  it("deletes the tree and returns success", async () => {
    prismaMock.familyTree.delete.mockResolvedValue({ id: "t1" });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/delete",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Tree deleted successfully",
    });
    expect(prismaMock.familyTree.delete).toHaveBeenCalledWith({
      where: { id: "t1" },
    });
  });

  it("returns 403 when user is not owner", async () => {
    getTreeRoleMock.mockResolvedValue("editor");

    const request = new NextRequest(
      "http://localhost/api/trees/t1/delete",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
    expect(prismaMock.familyTree.delete).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/delete",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });
});
