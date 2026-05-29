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
      owner: { locale: "ru" },
    });
    prismaMock.treeMember.findMany.mockResolvedValue([
      { id: "m1", isLiving: true, birthYear: 1984 },
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
  });

  it("returns es ownerLocale when owner locale is Spanish", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      ownerId: "u1",
      shareEnabled: true,
      shareToken: "token-es",
      name: "García Family",
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
});
