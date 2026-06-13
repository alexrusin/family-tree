import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, prismaClientCtorMock, prismaPgMock } = vi.hoisted(() => {
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    treeMember: {
      findMany: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
    publicShareTokenHistory: {
      findUnique: vi.fn(),
    },
  };

  return {
    prismaMock,
    prismaClientCtorMock: vi.fn(function PrismaClientMock() {
      return prismaMock;
    }),
    prismaPgMock: vi.fn(function PrismaPgMock() {
      return {};
    }),
  };
});

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientCtorMock,
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: prismaPgMock }));

const { GET } = await import("./route");

describe("GET /api/public-tree/[shareToken]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with members and relationships for active token", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-active",
      name: "Miller Family",
      nodePositions: null,
      owner: { locale: "ru" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([
      {
        id: "m1",
        treeId: "t1",
        isLiving: true,
        birthYear: 1984,
        photoKey: "trees/t1/members/m1.webp",
        photoUrl: "trees/t1/members/m1.webp",
      },
    ]);
    prismaMock.relationship.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-active",
      {
        method: "GET",
      },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-active" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.members[0].birthYear).toBeNull();
    expect(body.members[0].photoUrl).toBe("/api/trees/t1/members/m1/photo?v=m1");
  });

  it("returns es ownerLocale when owner locale is Spanish", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-es",
      name: "García Family",
      nodePositions: null,
      owner: { locale: "es" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([]);
    prismaMock.relationship.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-es",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-es" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ownerLocale).toBe("es");
  });

  it("returns 410 when active token exists but sharing disabled", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: false,
      shareToken: "token-disabled",
      name: "Miller Family",
    });

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-disabled",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-disabled" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_LINK_DISABLED",
    });
  });

  it("returns 410 for regenerated historical token", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue(null);
    prismaMock.publicShareTokenHistory.findUnique.mockResolvedValue({
      id: "h1",
      treeId: "t1",
    });

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-old",
      {
        method: "GET",
      },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-old" }),
    });

    expect(response.status).toBe(410);
  });

  it("returns 404 for unknown token", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue(null);
    prismaMock.publicShareTokenHistory.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-unknown",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-unknown" }),
    });

    expect(response.status).toBe(404);
  });

  it("includes null arrangement when nodePositions is null", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-no-arr",
      name: "Miller Family",
      nodePositions: null,
      owner: { locale: "en" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([]);
    prismaMock.relationship.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-no-arr",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-no-arr" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });

  it("includes saved arrangement when nodePositions is valid", async () => {
    const savedArrangement = { m1: { x: 100, y: 200 }, m2: { x: 300, y: 400 } };
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-with-arr",
      name: "Miller Family",
      nodePositions: savedArrangement,
      owner: { locale: "en" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([]);
    prismaMock.relationship.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-with-arr",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-with-arr" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(savedArrangement);
  });

  it("returns null arrangement when nodePositions contains invalid data", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-bad-arr",
      name: "Miller Family",
      nodePositions: { m1: { x: "not-a-number", y: 0 } },
      owner: { locale: "en" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([]);
    prismaMock.relationship.findMany.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/public-tree/token-bad-arr",
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ shareToken: "token-bad-arr" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });
});
