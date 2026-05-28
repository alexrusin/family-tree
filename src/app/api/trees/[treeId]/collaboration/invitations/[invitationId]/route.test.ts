import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
  generateInvitationTokenMock,
  hashInvitationTokenMock,
  invitationExpiresAtMock,
  sendInvitationEmailMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const generateInvitationTokenMock = vi.fn();
  const hashInvitationTokenMock = vi.fn();
  const invitationExpiresAtMock = vi.fn();
  const sendInvitationEmailMock = vi.fn();

  const prismaClientMock = {
    familyTree: {
      findUnique: vi.fn(),
    },
    collaborator: {
      findUnique: vi.fn(),
    },
    invitation: {
      findFirst: vi.fn(),
      update: vi.fn(),
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
    generateInvitationTokenMock,
    hashInvitationTokenMock,
    invitationExpiresAtMock,
    sendInvitationEmailMock,
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

vi.mock("@/lib/tree-domain/invitation-token", () => ({
  generateInvitationToken: generateInvitationTokenMock,
  hashInvitationToken: hashInvitationTokenMock,
  invitationExpiresAt: invitationExpiresAtMock,
}));

vi.mock("@/lib/invitation-email", () => ({
  sendInvitationEmail: sendInvitationEmailMock,
}));

const { PATCH, DELETE } = await import("./route");

describe("/api/trees/[treeId]/collaboration/invitations/[invitationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.BETTER_AUTH_URL = "http://localhost:3000";

    getSessionMock.mockResolvedValue({
      user: {
        id: "u-owner",
        email: "owner@example.com",
        name: "Tree Owner",
      },
    });

    prismaClientMock.familyTree.findUnique.mockImplementation(
      async (args: { select?: { ownerId?: true; name?: true } }) => {
        if (args.select?.ownerId) {
          return { ownerId: "u-owner" };
        }
        if (args.select?.name) {
          return { name: "Smith Family" };
        }
        return { id: "t1", ownerId: "u-owner", name: "Smith Family" };
      },
    );

    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);

    prismaClientMock.invitation.findFirst.mockResolvedValue({
      id: "i1",
      invitedEmail: "invitee@example.com",
      role: "editor",
      message: "Please join",
      locale: "ru",
    });
    prismaClientMock.invitation.update.mockResolvedValue({ id: "i1" });

    generateInvitationTokenMock.mockReturnValue("raw-token");
    hashInvitationTokenMock.mockReturnValue("hashed-token");
    invitationExpiresAtMock.mockReturnValue(
      new Date("2026-05-21T00:00:00.000Z"),
    );
    sendInvitationEmailMock.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated PATCH", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for non-owner PATCH", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 for missing pending invitation on PATCH", async () => {
    prismaClientMock.invitation.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i404",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_NOT_FOUND",
    });
    expect(sendInvitationEmailMock).not.toHaveBeenCalled();
  });

  it("resends pending invitation for owner and returns success true", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaClientMock.invitation.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: {
        tokenHash: "hashed-token",
        expiresAt: new Date("2026-05-21T00:00:00.000Z"),
        status: "pending",
        acceptedAt: null,
        cancelledAt: null,
      },
    });
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "ru",
        to: "invitee@example.com",
        role: "editor",
        message: "Please join",
        acceptUrl: "http://localhost:3000/ru/invitations/accept/raw-token",
      }),
    );
  });

  it("resends spanish invitation using stored es locale", async () => {
    prismaClientMock.invitation.findFirst.mockResolvedValue({
      id: "i2",
      invitedEmail: "amiga@example.com",
      role: "viewer",
      message: null,
      locale: "es",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i2",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i2" }),
    });

    expect(response.status).toBe(200);
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "es",
        to: "amiga@example.com",
        acceptUrl: "http://localhost:3000/es/invitations/accept/raw-token",
      }),
    );
  });

  it("returns 401 for unauthenticated DELETE", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for non-owner DELETE", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-viewer" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "viewer",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 for missing pending invitation on DELETE", async () => {
    prismaClientMock.invitation.findFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i404",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i404" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_NOT_FOUND",
    });
  });

  it("cancels pending invitation for owner and returns success true", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/invitations/i1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", invitationId: "i1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaClientMock.invitation.update).toHaveBeenCalledWith({
      where: {
        id: "i1",
      },
      data: {
        status: "cancelled",
        cancelledAt: expect.any(Date),
      },
    });
  });
});
