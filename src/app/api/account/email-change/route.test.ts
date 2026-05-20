import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
  sendPendingEmailChangeEmailMock,
  generatePendingEmailChangeTokenMock,
  hashPendingEmailChangeTokenMock,
  pendingEmailChangeExpiresAtMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const sendPendingEmailChangeEmailMock = vi.fn();
  const generatePendingEmailChangeTokenMock = vi.fn();
  const hashPendingEmailChangeTokenMock = vi.fn();
  const pendingEmailChangeExpiresAtMock = vi.fn();

  const prismaClientMock = {
    user: {
      findUnique: vi.fn(),
    },
    pendingEmailChange: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
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
    sendPendingEmailChangeEmailMock,
    generatePendingEmailChangeTokenMock,
    hashPendingEmailChangeTokenMock,
    pendingEmailChangeExpiresAtMock,
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

vi.mock("@/lib/pending-email-change-email", () => ({
  sendPendingEmailChangeEmail: sendPendingEmailChangeEmailMock,
}));

vi.mock("@/lib/pending-email-change-token", () => ({
  generatePendingEmailChangeToken: generatePendingEmailChangeTokenMock,
  hashPendingEmailChangeToken: hashPendingEmailChangeTokenMock,
  pendingEmailChangeExpiresAt: pendingEmailChangeExpiresAtMock,
}));

const { POST, PATCH } = await import("./route");

describe("/api/account/email-change", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.BETTER_AUTH_URL = "http://localhost:3000";

    getSessionMock.mockResolvedValue({
      user: {
        id: "u1",
      },
    });

    prismaClientMock.user.findUnique.mockImplementation(
      async (args: { where: { id?: string; email?: string } }) => {
        if (args.where.id) {
          return {
            id: "u1",
            email: "alex@example.com",
            locale: "en",
          };
        }

        if (args.where.email === "taken@example.com") {
          return { id: "u-other" };
        }

        return null;
      },
    );

    generatePendingEmailChangeTokenMock.mockReturnValue("raw-token");
    hashPendingEmailChangeTokenMock.mockReturnValue("hashed-token");
    pendingEmailChangeExpiresAtMock.mockReturnValue(
      new Date("2026-05-21T00:00:00.000Z"),
    );

    prismaClientMock.pendingEmailChange.upsert.mockResolvedValue({
      id: "pec1",
    });
    prismaClientMock.pendingEmailChange.findUnique.mockResolvedValue({
      id: "pec1",
      userId: "u1",
      newEmail: "new@example.com",
      locale: "en",
    });
    prismaClientMock.pendingEmailChange.update.mockResolvedValue({
      id: "pec1",
    });
    sendPendingEmailChangeEmailMock.mockResolvedValue(undefined);
  });

  it("returns 401 for unauthenticated POST", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", locale: "en" }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 for invalid email in POST", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "POST",
        body: JSON.stringify({ email: "abc" }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_EMAIL",
    });
  });

  it("returns 409 when new email equals current email", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "POST",
        body: JSON.stringify({ email: "Alex@example.com" }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_UNCHANGED",
    });
  });

  it("returns 409 when new email is already in use", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "POST",
        body: JSON.stringify({ email: "taken@example.com" }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_IN_USE",
    });
  });

  it("creates pending email change and sends verification email", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", locale: "ru" }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      pendingEmailChange: {
        email: "new@example.com",
        expiresAt: "2026-05-21T00:00:00.000Z",
      },
    });

    expect(prismaClientMock.pendingEmailChange.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: {
        userId: "u1",
        newEmail: "new@example.com",
        tokenHash: "hashed-token",
        locale: "ru",
        expiresAt: new Date("2026-05-21T00:00:00.000Z"),
      },
      update: {
        newEmail: "new@example.com",
        tokenHash: "hashed-token",
        locale: "ru",
        expiresAt: new Date("2026-05-21T00:00:00.000Z"),
      },
    });

    expect(sendPendingEmailChangeEmailMock).toHaveBeenCalledWith({
      locale: "ru",
      verifyUrl: "http://localhost:3000/ru/verify-email-change/raw-token",
      nextEmail: "new@example.com",
      to: "new@example.com",
    });
  });

  it("returns 404 when no pending email change exists for PATCH", async () => {
    prismaClientMock.pendingEmailChange.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_PENDING_EMAIL_CHANGE_NOT_FOUND",
    });
  });

  it("resends verification for pending email change", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change",
      {
        method: "PATCH",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      pendingEmailChange: {
        email: "new@example.com",
        expiresAt: "2026-05-21T00:00:00.000Z",
      },
    });

    expect(prismaClientMock.pendingEmailChange.update).toHaveBeenCalledWith({
      where: { id: "pec1" },
      data: {
        tokenHash: "hashed-token",
        expiresAt: new Date("2026-05-21T00:00:00.000Z"),
      },
    });
    expect(sendPendingEmailChangeEmailMock).toHaveBeenCalledWith({
      locale: "en",
      verifyUrl: "http://localhost:3000/en/verify-email-change/raw-token",
      nextEmail: "new@example.com",
      to: "new@example.com",
    });
  });
});
