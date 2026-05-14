import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaClientMock = {
    familyTree: {
      findUnique: vi.fn(),
    },
    collaborator: {
      findUnique: vi.fn(),
    },
    relationship: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    getSessionMock,
    prismaClientMock,
    prismaClientConstructorMock: vi.fn(function PrismaClientMock() {
      return prismaClientMock;
    }),
    prismaPgMock: vi.fn(function PrismaPgMock() {
      return {};
    }),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientConstructorMock,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: prismaPgMock,
}));

const { DELETE } = await import("./route");

describe("DELETE /api/trees/[treeId]/relationships/[relationshipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.relationship.findFirst.mockResolvedValue({ id: "r1" });
    prismaClientMock.relationship.delete.mockResolvedValue({ id: "r1" });
  });

  it("returns 401 for unauthenticated request", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships/r1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", relationshipId: "r1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for viewer", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u2" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "viewer",
      acceptedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships/r1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", relationshipId: "r1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 when relationship does not exist in tree", async () => {
    prismaClientMock.relationship.findFirst.mockResolvedValue(null);

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
    expect(prismaClientMock.relationship.delete).not.toHaveBeenCalled();
  });

  it("allows editor to delete relationship", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u2" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date(),
    });

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
    expect(prismaClientMock.relationship.delete).toHaveBeenCalledWith({
      where: { id: "r1" },
    });
  });
});