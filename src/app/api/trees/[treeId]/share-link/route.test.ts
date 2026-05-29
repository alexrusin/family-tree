import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashPublicShareToken } from "@/lib/tree-domain/public-share-service";

const { getSessionMock, prismaMock, prismaClientCtorMock, prismaPgMock } =
  vi.hoisted(() => {
    const getSessionMock = vi.fn();
    const prismaMock = {
      familyTree: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      collaborator: {
        findUnique: vi.fn(),
      },
      publicShareTokenHistory: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
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

const { GET, PATCH } = await import("./route");

describe("/api/trees/[treeId]/share-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    getSessionMock.mockResolvedValue({
      user: { id: "u-owner", email: "owner@example.com" },
    });

    prismaMock.familyTree.findUnique.mockImplementation(
      async (args: {
        where: { id: string };
        select?: { ownerId?: true; shareToken?: true; shareEnabled?: true };
      }) => {
        if (args.select?.ownerId) return { ownerId: "u-owner" };
        return {
          id: "t1",
          shareToken: "token-1",
          shareEnabled: false,
        };
      },
    );
    prismaMock.collaborator.findUnique.mockResolvedValue(null);
    prismaMock.familyTree.update.mockResolvedValue({
      id: "t1",
      shareToken: "token-2",
      shareEnabled: true,
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
    );
  });

  it("returns 401 for unauthenticated GET", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/share-link",
      {
        method: "GET",
      },
    );
    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns share state for owner GET", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/share-link",
      {
        method: "GET",
      },
    );
    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      shareEnabled: false,
      shareToken: "token-1",
      publicUrl: "http://localhost:3000/t/token-1",
    });
  });

  it("returns 403 for non-owner PATCH", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u-owner" });
    prismaMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/share-link",
      {
        method: "PATCH",
        body: JSON.stringify({ action: "setEnabled", enabled: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });
    expect(response.status).toBe(403);
  });

  it("toggles enabled state for owner PATCH", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/share-link",
      {
        method: "PATCH",
        body: JSON.stringify({ action: "setEnabled", enabled: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });
    expect(response.status).toBe(200);
    expect(prismaMock.familyTree.update).toHaveBeenCalled();
  });

  it("regenerates token for owner PATCH", async () => {
    prismaMock.publicShareTokenHistory.create.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/share-link",
      {
        method: "PATCH",
        body: JSON.stringify({ action: "regenerate" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.publicShareTokenHistory.create).toHaveBeenCalledWith({
      data: {
        treeId: "t1",
        tokenHash: hashPublicShareToken("token-1"),
        status: "regenerated",
      },
    });
    const body = await response.json();
    expect(body.shareToken).toBe("token-2");
  });
});
