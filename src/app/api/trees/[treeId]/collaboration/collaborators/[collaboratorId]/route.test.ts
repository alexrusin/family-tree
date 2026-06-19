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
    collaborator: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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
}));

const { PATCH, DELETE } = await import("./route");

describe("/api/trees/[treeId]/collaboration/collaborators/[collaboratorId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    getTreeRoleMock.mockResolvedValue("owner");
    prismaMock.collaborator.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.collaborator.update.mockResolvedValue({ id: "c1" });
    prismaMock.collaborator.delete.mockResolvedValue({ id: "c1" });
  });

  it("returns 400 for invalid role payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c1",
      {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_ROLE",
    });
    expect(prismaMock.collaborator.update).not.toHaveBeenCalled();
  });

  it("returns 404 for missing collaborator role PATCH target", async () => {
    prismaMock.collaborator.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c404",
      {
        method: "PATCH",
        body: JSON.stringify({ role: "viewer" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_COLLABORATOR_NOT_FOUND",
    });
  });

  it("updates collaborator role for owner and returns success true", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c1",
      {
        method: "PATCH",
        body: JSON.stringify({ role: "viewer" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.collaborator.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        role: "viewer",
      },
    });
  });

  it("returns 404 for missing collaborator DELETE target", async () => {
    prismaMock.collaborator.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c404",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_COLLABORATOR_NOT_FOUND",
    });
  });

  it("removes collaborator for owner and returns success true", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.collaborator.delete).toHaveBeenCalledWith({
      where: {
        id: "c1",
      },
    });
  });
});
