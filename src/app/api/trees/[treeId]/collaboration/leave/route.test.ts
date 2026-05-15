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

const { POST } = await import("./route");

describe("/api/trees/[treeId]/collaboration/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });
    prismaClientMock.collaborator.delete.mockResolvedValue({ id: "c1" });
  });

  it("returns 401 for unauthenticated leave POST", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
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

  it("returns 400 when owner tries to leave", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_OWNER_CANNOT_LEAVE",
    });
    expect(prismaClientMock.collaborator.delete).not.toHaveBeenCalled();
  });

  it("returns 403 when user has no accepted collaborator access", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-stranger" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
    expect(prismaClientMock.collaborator.delete).not.toHaveBeenCalled();
  });

  it("allows accepted non-owner collaborator to leave", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaClientMock.collaborator.delete).toHaveBeenCalledWith({
      where: {
        treeId_userId: {
          treeId: "t1",
          userId: "u-editor",
        },
      },
    });
  });
});