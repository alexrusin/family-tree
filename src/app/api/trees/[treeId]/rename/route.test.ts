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
      update: vi.fn(),
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

const { POST } = await import("./route");

describe("POST /api/trees/[treeId]/rename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    getTreeRoleMock.mockResolvedValue("owner");
  });

  it("renames the tree and returns it", async () => {
    prismaMock.familyTree.update.mockResolvedValue({
      id: "t1",
      name: "New Name",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({ name: " New Name " }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      tree: { id: "t1", name: "New Name" },
    });
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { name: "New Name" },
    });
  });

  it("returns 400 when name is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_TREE_NAME_REQUIRED",
    });
    expect(prismaMock.familyTree.update).not.toHaveBeenCalled();
  });

  it("returns 400 when name is blank after trim", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_TREE_NAME_LENGTH",
    });
    expect(prismaMock.familyTree.update).not.toHaveBeenCalled();
  });

  it("returns 400 when name exceeds 255 characters", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({ name: "a".repeat(256) }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_TREE_NAME_LENGTH",
    });
  });

  it("returns 403 when user is not owner", async () => {
    getTreeRoleMock.mockResolvedValue("editor");

    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Name" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 401 when not authenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/rename",
      {
        method: "POST",
        body: JSON.stringify({ name: "New Name" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });
});
