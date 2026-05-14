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
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
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

const { GET, POST } = await import("./route");

describe("/api/trees/[treeId]/relationships", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.relationship.findMany.mockResolvedValue([]);
    prismaClientMock.relationship.findFirst.mockResolvedValue(null);
    prismaClientMock.relationship.create.mockResolvedValue({
      id: "r1",
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "parent",
    });
  });

  it("returns 401 for unauthenticated GET", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "GET",
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 for invalid relationship payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "POST",
        body: JSON.stringify({ fromMemberId: "A", toMemberId: "B" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_RELATIONSHIP",
    });
    expect(prismaClientMock.relationship.create).not.toHaveBeenCalled();
  });

  it("returns 400 for self relationship", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "POST",
        body: JSON.stringify({
          fromMemberId: "A",
          toMemberId: "A",
          type: "sibling",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_SELF_RELATIONSHIP",
    });
    expect(prismaClientMock.relationship.create).not.toHaveBeenCalled();
  });

  it("returns 409 for canonical duplicate relationship", async () => {
    prismaClientMock.relationship.findFirst.mockResolvedValue({ id: "r-existing" });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "POST",
        body: JSON.stringify({
          fromMemberId: "B",
          toMemberId: "A",
          type: "child",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_DUPLICATE_RELATIONSHIP",
    });
    expect(prismaClientMock.relationship.findFirst).toHaveBeenCalledWith({
      where: {
        treeId: "t1",
        fromMemberId: "A",
        toMemberId: "B",
        type: "parent",
      },
      select: { id: true },
    });
    expect(prismaClientMock.relationship.create).not.toHaveBeenCalled();
  });

  it("creates canonical relationship for inverse child input", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "POST",
        body: JSON.stringify({
          fromMemberId: "B",
          toMemberId: "A",
          type: "child",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      relationship: {
        id: "r1",
        treeId: "t1",
        fromMemberId: "A",
        toMemberId: "B",
        type: "parent",
      },
    });
    expect(prismaClientMock.relationship.create).toHaveBeenCalledWith({
      data: {
        treeId: "t1",
        fromMemberId: "A",
        toMemberId: "B",
        type: "parent",
      },
    });
  });
});