import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  getTreeRoleMock,
  prismaMock,
  generateInvitationTokenMock,
  hashInvitationTokenMock,
  invitationExpiresAtMock,
  sendInvitationEmailMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const generateInvitationTokenMock = vi.fn();
  const hashInvitationTokenMock = vi.fn();
  const invitationExpiresAtMock = vi.fn();
  const sendInvitationEmailMock = vi.fn();

  const prismaMock = {
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
    getTreeRoleMock,
    prismaMock,
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

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
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

    getTreeRoleMock.mockResolvedValue("owner");

    prismaMock.familyTree.findUnique.mockImplementation(
      async (args: { select?: { name?: true } }) => {
        if (args.select?.name) {
          return { name: "Smith Family" };
        }
        return { id: "t1", name: "Smith Family" };
      },
    );
    prismaMock.collaborator.findUnique.mockResolvedValue(null);
    prismaMock.collaborator.findMany.mockResolvedValue([]);
    prismaMock.invitation.findMany.mockResolvedValue([]);
    prismaMock.invitation.findFirst.mockResolvedValue(null);
    prismaMock.invitation.create.mockResolvedValue({
      id: "i1",
      status: "pending",
    });
    prismaMock.invitation.update.mockResolvedValue({
      id: "i1",
      status: "pending",
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    generateInvitationTokenMock.mockReturnValue("token-raw");
    hashInvitationTokenMock.mockReturnValue("token-hash");
    invitationExpiresAtMock.mockReturnValue(
      new Date("2026-05-21T00:00:00.000Z"),
    );
    sendInvitationEmailMock.mockResolvedValue(undefined);
  });

  it("returns collaborators and pending invitations for owner GET", async () => {
    prismaMock.collaborator.findMany.mockResolvedValue([
      {
        id: "c1",
        treeId: "t1",
        userId: "u2",
        role: "editor",
      },
    ]);
    prismaMock.invitation.findMany.mockResolvedValue([
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
    getTreeRoleMock.mockResolvedValue("editor");
    prismaMock.collaborator.findMany.mockResolvedValue([
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
    expect(prismaMock.invitation.findMany).not.toHaveBeenCalled();
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
    expect(prismaMock.invitation.create).not.toHaveBeenCalled();
  });

  it("returns 409 when inviting accepted collaborator", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "ru",
    });
    prismaMock.collaborator.findUnique.mockImplementation(
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
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "ru",
    });
    prismaMock.collaborator.findUnique.mockImplementation(
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
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-invitee",
      locale: "es",
    });
    prismaMock.collaborator.findUnique.mockResolvedValue(null);

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
    prismaMock.user.findUnique.mockResolvedValue(null);

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
