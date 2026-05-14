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
      update: vi.fn(),
    },
    collaborator: {
      findUnique: vi.fn(),
    },
    treeMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      await callback(prismaClientMock);
    }),
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

const { PATCH, DELETE } = await import("./route");

describe("/api/trees/[treeId]/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.treeMember.findFirst.mockResolvedValue({ id: "m1" });
    prismaClientMock.treeMember.update.mockResolvedValue({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
    });
    prismaClientMock.treeMember.delete.mockResolvedValue({ id: "m1" });
    prismaClientMock.familyTree.update.mockResolvedValue({ id: "t1" });
  });

  it("returns 401 for unauthenticated PATCH", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: JSON.stringify({ firstName: "Elena" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 when PATCH firstName is blank", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: JSON.stringify({ firstName: "   " }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FIRST_NAME_REQUIRED",
    });
    expect(prismaClientMock.treeMember.update).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated DELETE", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for editor DELETE (owner-only action)", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u2" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });
});
