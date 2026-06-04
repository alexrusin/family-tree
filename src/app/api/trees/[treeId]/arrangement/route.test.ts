import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, prismaClientCtorMock, prismaPgMock, authMock } =
  vi.hoisted(() => {
    const prismaMock = {
      familyTree: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      collaborator: {
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
      authMock: { api: { getSession: vi.fn() } },
    };
  });

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientCtorMock,
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: prismaPgMock }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

const { GET, PUT } = await import("./route");

const OWNER_SESSION = { user: { id: "owner-1" } };
const EDITOR_SESSION = { user: { id: "editor-1" } };
const VIEWER_SESSION = { user: { id: "viewer-1" } };

function setupEditorCollaborator() {
  prismaMock.collaborator.findUnique.mockResolvedValue({
    role: "editor",
    acceptedAt: new Date(),
  });
}

function setupViewerCollaborator() {
  prismaMock.collaborator.findUnique.mockResolvedValue({
    role: "viewer",
    acceptedAt: new Date(),
  });
}

function makeGetRequest(treeId = "tree-1") {
  return new NextRequest(
    `http://localhost/api/trees/${treeId}/arrangement`,
    { method: "GET" },
  );
}

function makePutRequest(body: unknown, treeId = "tree-1") {
  return new NextRequest(
    `http://localhost/api/trees/${treeId}/arrangement`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("GET /api/trees/[treeId]/arrangement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.api.getSession.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 when user has no tree access", async () => {
    authMock.api.getSession.mockResolvedValue(EDITOR_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns null arrangement when nodePositions is null", async () => {
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    // First call: getTreeRole, second call: load nodePositions
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "owner-1" })
      .mockResolvedValueOnce({ nodePositions: null });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });

  it("returns null arrangement when stored JSON is invalid", async () => {
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "owner-1" })
      .mockResolvedValueOnce({ nodePositions: { bad: "data" } });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });

  it("returns saved arrangement when nodePositions is valid", async () => {
    const savedArrangement = { m1: { x: 100, y: 200 }, m2: { x: 300, y: 400 } };
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "owner-1" })
      .mockResolvedValueOnce({ nodePositions: savedArrangement });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(savedArrangement);
  });

  it("allows a collaborator viewer to read the arrangement", async () => {
    authMock.api.getSession.mockResolvedValue(VIEWER_SESSION);
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "owner-1" })
      .mockResolvedValueOnce({ nodePositions: null });
    setupViewerCollaborator();

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
  });
});

describe("PUT /api/trees/[treeId]/arrangement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.api.getSession.mockResolvedValue(null);

    const response = await PUT(makePutRequest({ arrangement: {} }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 when user has viewer role", async () => {
    authMock.api.getSession.mockResolvedValue(VIEWER_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    setupViewerCollaborator();

    const response = await PUT(
      makePutRequest({ arrangement: { m1: { x: 10, y: 20 } } }),
      { params: Promise.resolve({ treeId: "tree-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 when arrangement body is invalid", async () => {
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "owner-1" });

    const response = await PUT(
      makePutRequest({ arrangement: { m1: { x: "bad", y: 20 } } }),
      { params: Promise.resolve({ treeId: "tree-1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_INVALID_ARRANGEMENT");
  });

  it("saves valid arrangement for owner and returns it", async () => {
    const arrangement = { m1: { x: 10, y: 20 }, m2: { x: 30, y: 40 } };
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    prismaMock.familyTree.update.mockResolvedValue({});

    const response = await PUT(makePutRequest({ arrangement }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(arrangement);
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nodePositions: arrangement }),
      }),
    );
  });

  it("saves valid arrangement for editor and returns it", async () => {
    const arrangement = { m1: { x: 5, y: 15 } };
    authMock.api.getSession.mockResolvedValue(EDITOR_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    setupEditorCollaborator();
    prismaMock.familyTree.update.mockResolvedValue({});

    const response = await PUT(makePutRequest({ arrangement }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(arrangement);
  });

  it("saves an empty arrangement (clears all positions)", async () => {
    authMock.api.getSession.mockResolvedValue(OWNER_SESSION);
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "owner-1" });
    prismaMock.familyTree.update.mockResolvedValue({});

    const response = await PUT(makePutRequest({ arrangement: {} }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual({});
  });
});
