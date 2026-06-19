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
    relationship: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
  canEditMembers: (role: string) => role === "owner" || role === "editor",
}));

const { DELETE } = await import("./route");

describe("DELETE /api/trees/[treeId]/relationships/[relationshipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    getTreeRoleMock.mockResolvedValue("owner");
    prismaMock.relationship.findFirst.mockResolvedValue({ id: "r1" });
    prismaMock.relationship.delete.mockResolvedValue({ id: "r1" });
  });

  it("returns 404 when relationship does not exist in tree", async () => {
    prismaMock.relationship.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships/r1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", relationshipId: "r1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_RELATIONSHIP_NOT_FOUND",
    });
    expect(prismaMock.relationship.delete).not.toHaveBeenCalled();
  });

  it("deletes relationship successfully", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships/r1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", relationshipId: "r1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.relationship.delete).toHaveBeenCalledWith({
      where: { id: "r1" },
    });
  });
});
