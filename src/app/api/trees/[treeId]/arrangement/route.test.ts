import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, getTreeRoleMock, prismaMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
}));

const { GET, PUT } = await import("./route");

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
    getSessionMock.mockResolvedValue({ user: { id: "owner-1" } });
    getTreeRoleMock.mockResolvedValue("owner");
  });

  it("returns null arrangement when nodePositions is null", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ nodePositions: null });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });

  it("returns null arrangement when stored JSON is invalid", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ nodePositions: { bad: "data" } });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toBeNull();
  });

  it("returns saved arrangement when nodePositions is valid", async () => {
    const savedArrangement = { m1: { x: 100, y: 200 }, m2: { x: 300, y: 400 } };
    prismaMock.familyTree.findUnique.mockResolvedValue({ nodePositions: savedArrangement });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(savedArrangement);
  });

  it("allows a collaborator viewer to read the arrangement", async () => {
    getTreeRoleMock.mockResolvedValue("viewer");
    prismaMock.familyTree.findUnique.mockResolvedValue({ nodePositions: null });

    const response = await GET(makeGetRequest(), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
  });
});

describe("PUT /api/trees/[treeId]/arrangement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "owner-1" } });
    getTreeRoleMock.mockResolvedValue("owner");
  });

  it("returns 400 when arrangement body is invalid", async () => {
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
    getTreeRoleMock.mockResolvedValue("editor");
    prismaMock.familyTree.update.mockResolvedValue({});

    const response = await PUT(makePutRequest({ arrangement }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual(arrangement);
  });

  it("saves an empty arrangement (clears all positions)", async () => {
    prismaMock.familyTree.update.mockResolvedValue({});

    const response = await PUT(makePutRequest({ arrangement: {} }), {
      params: Promise.resolve({ treeId: "tree-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.arrangement).toEqual({});
  });
});
