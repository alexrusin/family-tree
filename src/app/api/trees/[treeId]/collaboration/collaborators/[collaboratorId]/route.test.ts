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
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const { PATCH, DELETE } = await import("./route");

describe("/api/trees/[treeId]/collaboration/collaborators/[collaboratorId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u-owner" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.collaborator.findFirst.mockResolvedValue({ id: "c1" });
    prismaClientMock.collaborator.update.mockResolvedValue({ id: "c1" });
    prismaClientMock.collaborator.delete.mockResolvedValue({ id: "c1" });
  });

  it("returns 401 for unauthenticated collaborator role PATCH", async () => {
    getSessionMock.mockResolvedValue(null);

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

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
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
    expect(prismaClientMock.collaborator.update).not.toHaveBeenCalled();
  });

  it("returns 403 for non-owner collaborator role PATCH", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });

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

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 for missing collaborator role PATCH target", async () => {
    prismaClientMock.collaborator.findFirst.mockResolvedValue(null);

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
    expect(prismaClientMock.collaborator.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        role: "viewer",
      },
    });
  });

  it("returns 401 for unauthenticated collaborator DELETE", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for non-owner collaborator DELETE", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-viewer" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "viewer",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/collaborators/c1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", collaboratorId: "c1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 for missing collaborator DELETE target", async () => {
    prismaClientMock.collaborator.findFirst.mockResolvedValue(null);

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
    expect(prismaClientMock.collaborator.delete).toHaveBeenCalledWith({
      where: {
        id: "c1",
      },
    });
  });
});