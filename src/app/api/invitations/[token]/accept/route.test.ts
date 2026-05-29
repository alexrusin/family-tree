import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaClientMock = {
    invitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    collaborator: {
      upsert: vi.fn(),
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

const { POST } = await import("./route");

describe("/api/invitations/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T00:00:00.000Z"));

    getSessionMock.mockResolvedValue({
      user: {
        id: "u-invitee",
        email: "invitee@example.com",
      },
    });

    prismaClientMock.invitation.findUnique.mockResolvedValue({
      id: "i1",
      treeId: "t1",
      invitedEmail: "invitee@example.com",
      role: "editor",
      status: "pending",
      expiresAt: new Date("2026-05-21T00:00:00.000Z"),
    });

    prismaClientMock.collaborator.upsert.mockResolvedValue({
      id: "c1",
      treeId: "t1",
      role: "editor",
    });

    prismaClientMock.invitation.update.mockResolvedValue({ id: "i1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 for unauthenticated accept POST", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 401 when session user has no email", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "u-invitee",
      },
    });

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 404 when invitation is missing", async () => {
    prismaClientMock.invitation.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_NOT_FOUND",
    });
  });

  it("returns 404 when invitation status is not pending", async () => {
    prismaClientMock.invitation.findUnique.mockResolvedValue({
      id: "i1",
      treeId: "t1",
      invitedEmail: "invitee@example.com",
      role: "editor",
      status: "cancelled",
      expiresAt: new Date("2026-05-21T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_NOT_FOUND",
    });
  });

  it("returns 409 when authenticated email mismatches invitation email", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "u-other",
        email: "other@example.com",
      },
    });

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_EMAIL_MISMATCH",
    });
  });

  it("returns 410 when invitation is expired", async () => {
    prismaClientMock.invitation.findUnique.mockResolvedValue({
      id: "i1",
      treeId: "t1",
      invitedEmail: "invitee@example.com",
      role: "editor",
      status: "pending",
      expiresAt: new Date("2026-05-13T00:00:00.000Z"),
    });

    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVITATION_EXPIRED",
    });
  });

  it("accepts invitation and returns success with treeId", async () => {
    const request = new NextRequest(
      "http://localhost/api/invitations/raw-token/accept",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "raw-token" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      treeId: "t1",
    });

    expect(prismaClientMock.invitation.findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      select: {
        id: true,
        treeId: true,
        invitedEmail: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    });

    expect(prismaClientMock.collaborator.upsert).toHaveBeenCalledWith({
      where: {
        treeId_userId: {
          treeId: "t1",
          userId: "u-invitee",
        },
      },
      create: {
        treeId: "t1",
        userId: "u-invitee",
        role: "editor",
        invitedAt: expect.any(Date),
        acceptedAt: expect.any(Date),
      },
      update: {
        role: "editor",
        acceptedAt: expect.any(Date),
      },
      select: {
        id: true,
        treeId: true,
        role: true,
      },
    });

    expect(prismaClientMock.invitation.update).toHaveBeenCalledWith({
      where: {
        id: "i1",
      },
      data: {
        status: "accepted",
        acceptedAt: expect.any(Date),
        cancelledAt: null,
      },
    });
  });
});
