import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaMock, prismaClientCtorMock, prismaPgMock } =
  vi.hoisted(() => {
    const getSessionMock = vi.fn();
    const prismaMock = {
      familyTree: {
        findUnique: vi.fn(),
      },
      collaborator: {
        findUnique: vi.fn(),
      },
      treeMember: {
        findMany: vi.fn(),
      },
      relationship: {
        findMany: vi.fn(),
      },
    };

    return {
      getSessionMock,
      prismaMock,
      prismaClientCtorMock: vi.fn(function PrismaClientMock() {
        return prismaMock;
      }),
      prismaPgMock: vi.fn(function PrismaPgMock() {
        return {};
      }),
    };
  });

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientCtorMock,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: prismaPgMock,
}));

const { GET } = await import("./route");

describe("/api/trees/[treeId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      user: { id: "u-owner", email: "owner@example.com" },
    });

    prismaMock.familyTree.findUnique.mockImplementation(
      async (args: {
        where: { id: string };
        select?: { ownerId?: true; id?: true; name?: true };
      }) => {
        if (args.select?.ownerId) return { ownerId: "u-owner" };
        return { id: "t1", name: "Ivanov Family" };
      },
    );
    prismaMock.collaborator.findUnique.mockResolvedValue(null);
    prismaMock.treeMember.findMany.mockResolvedValue([
      { id: "m1", firstName: "Elena", lastName: "Ivanova" },
      { id: "m2", firstName: "Madonna", lastName: null },
    ]);
    prismaMock.relationship.findMany.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/export"),
      { params: Promise.resolve({ treeId: "t1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns a GEDCOM file with attachment headers for an owner", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/export"),
      { params: Promise.resolve({ treeId: "t1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ivanov-family.ged"',
    );

    const body = await response.text();
    expect(body).toContain("0 HEAD");
    expect(body).toContain("2 VERS 5.5.1");
    expect(body).toContain("1 CHAR UTF-8");
    expect(body).toContain("0 @I1@ INDI\r\n1 NAME Elena /Ivanova/\r\n");
    expect(body).toContain("0 @I2@ INDI\r\n1 NAME Madonna //\r\n");
    expect(body.trimEnd().endsWith("0 TRLR")).toBe(true);
  });

  it("returns 403 for a collaborator with no role on the tree", async () => {
    prismaMock.familyTree.findUnique.mockImplementation(
      async (args: {
        where: { id: string };
        select?: { ownerId?: true; id?: true; name?: true };
      }) => {
        if (args.select?.ownerId) return { ownerId: "someone-else" };
        return { id: "t1", name: "Ivanov Family" };
      },
    );
    prismaMock.collaborator.findUnique.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/export"),
      { params: Promise.resolve({ treeId: "t1" }) },
    );

    expect(response.status).toBe(403);
    expect((await response.json()).errorCode).toBe("ERR_FORBIDDEN");
  });
});
