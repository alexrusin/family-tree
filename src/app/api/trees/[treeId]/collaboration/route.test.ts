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
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    invitation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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

const { GET, POST } = await import("./route");

describe("/api/trees/[treeId]/collaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.BETTER_AUTH_URL = "http://localhost:3000";

    getSessionMock.mockResolvedValue({
      user: {
        id: "u-owner",
        email: "owner@example.com",
        name: "Tree Owner",
        locale: "en",
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
    prismaClientMock.collaborator.findMany.mockResolvedValue([]);
    prismaClientMock.invitation.findMany.mockResolvedValue([]);
    prismaClientMock.invitation.findFirst.mockResolvedValue(null);
    prismaClientMock.invitation.create.mockResolvedValue({
      id: "i1",
      status: "pending",
    });
    prismaClientMock.invitation.update.mockResolvedValue({
      id: "i1",
      status: "pending",
    });
    prismaClientMock.user.findUnique.mockResolvedValue(null);

    generateInvitationTokenMock.mockReturnValue("token-raw");
    hashInvitationTokenMock.mockReturnValue("token-hash");
    invitationExpiresAtMock.mockReturnValue(
      new Date("2026-05-21T00:00:00.000Z"),
    );
    sendInvitationEmailMock.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated GET", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "GET",
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for GET when actor has no access", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-stranger" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "GET",
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns collaborators and pending invitations for owner GET", async () => {
    prismaClientMock.collaborator.findMany.mockResolvedValue([
      {
        id: "c1",
        treeId: "t1",
        userId: "u2",
        role: "editor",
      },
    ]);
    prismaClientMock.invitation.findMany.mockResolvedValue([
      {
        id: "i1",
        treeId: "t1",
        invitedEmail: "invitee@example.com",
        status: "pending",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "GET",
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      collaborators: [
        {
          id: "c1",
          treeId: "t1",
          userId: "u2",
          role: "editor",
        },
      ],
      invitations: [
        {
          id: "i1",
          treeId: "t1",
          invitedEmail: "invitee@example.com",
          status: "pending",
        },
      ],
    });
  });

  it("returns empty invitations for non-owner GET", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });
    prismaClientMock.collaborator.findMany.mockResolvedValue([
      {
        id: "c1",
        treeId: "t1",
        userId: "u-editor",
        role: "editor",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "GET",
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      collaborators: [
        {
          id: "c1",
          treeId: "t1",
          userId: "u-editor",
          role: "editor",
        },
      ],
      invitations: [],
    });
    expect(prismaClientMock.invitation.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated POST", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "editor",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for POST when actor has no access", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u-stranger", email: "stranger@example.com" },
    });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "viewer",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 403 for POST when actor is non-owner collaborator", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u-editor", email: "editor@example.com" },
    });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({
      ownerId: "u-owner",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date("2026-05-14T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "viewer",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 400 for invalid invitation payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          role: "editor",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_INVITATION",
    });
    expect(prismaClientMock.invitation.create).not.toHaveBeenCalled();
  });

  it("returns 409 when inviting accepted collaborator", async () => {
    prismaClientMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "ru",
    });
    prismaClientMock.collaborator.findUnique.mockImplementation(
      async (args: {
        where: { treeId_userId: { treeId: string; userId: string } };
      }) => {
        if (args.where.treeId_userId.userId === "u-invitee") {
          return {
            id: "c-existing",
            acceptedAt: new Date("2026-05-10T00:00:00.000Z"),
          };
        }
        return null;
      },
    );

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "editor",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_ALREADY_COLLABORATOR",
    });
    expect(sendInvitationEmailMock).not.toHaveBeenCalled();
  });

  it("creates invitation and returns success true without token", async () => {
    prismaClientMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "ru",
    });
    prismaClientMock.collaborator.findUnique.mockImplementation(
      async (args: {
        where: { treeId_userId: { treeId: string; userId: string } };
      }) => {
        if (args.where.treeId_userId.userId === "u-invitee") {
          return null;
        }
        return null;
      },
    );

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: " INVITEE@EXAMPLE.COM ",
          role: "editor",
          message: " Please join us ",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "ru",
        to: "invitee@example.com",
        acceptUrl: "http://localhost:3000/ru/invitations/accept/token-raw",
        role: "editor",
        message: "Please join us",
      }),
    );
  });

  it("uses invitee spanish locale for invitation when invitee has es locale", async () => {
    prismaClientMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "es",
    });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "invitee@example.com",
          role: "viewer",
          message: null,
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(201);
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "es",
        acceptUrl: "http://localhost:3000/es/invitations/accept/token-raw",
      }),
    );
  });

  it("falls back to spanish owner locale when invitee has no saved locale", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "u-owner",
        email: "owner@example.com",
        name: "Tree Owner",
        locale: "es",
      },
    });
    prismaClientMock.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration",
      {
        method: "POST",
        body: JSON.stringify({
          email: "newuser@example.com",
          role: "editor",
          message: null,
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(201);
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "es",
        acceptUrl: "http://localhost:3000/es/invitations/accept/token-raw",
      }),
    );
  });
});
