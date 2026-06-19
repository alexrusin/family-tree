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
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
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

const { GET, POST } = await import("./route");

describe("/api/trees/[treeId]/relationships", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    getTreeRoleMock.mockResolvedValue("owner");
    prismaMock.relationship.findMany.mockResolvedValue([]);
    prismaMock.relationship.findFirst.mockResolvedValue(null);
    prismaMock.relationship.create.mockResolvedValue({
      id: "r1",
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "parent",
    });
  });

  it("lists relationships for a tree", async () => {
    const rels = [
      { id: "r1", treeId: "t1", fromMemberId: "A", toMemberId: "B", type: "parent" },
    ];
    prismaMock.relationship.findMany.mockResolvedValue(rels);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ relationships: rels });
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
    expect(prismaMock.relationship.create).not.toHaveBeenCalled();
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
    expect(prismaMock.relationship.create).not.toHaveBeenCalled();
  });

  it("returns 409 for canonical duplicate relationship", async () => {
    prismaMock.relationship.findFirst.mockResolvedValue({
      id: "r-existing",
    });

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
    expect(prismaMock.relationship.findFirst).toHaveBeenCalledWith({
      where: {
        treeId: "t1",
        fromMemberId: "A",
        toMemberId: "B",
        type: "parent",
      },
      select: { id: true },
    });
    expect(prismaMock.relationship.create).not.toHaveBeenCalled();
  });

  it("returns 409 when prisma raises P2002", async () => {
    prismaMock.relationship.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );

    const request = new NextRequest(
      "http://localhost/api/trees/t1/relationships",
      {
        method: "POST",
        body: JSON.stringify({
          fromMemberId: "A",
          toMemberId: "B",
          type: "parent",
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
    expect(prismaMock.relationship.create).toHaveBeenCalledWith({
      data: {
        treeId: "t1",
        fromMemberId: "A",
        toMemberId: "B",
        type: "parent",
      },
    });
  });
});
