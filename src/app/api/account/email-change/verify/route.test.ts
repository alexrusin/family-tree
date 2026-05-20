import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  prismaClientMock,
  hashPendingEmailChangeTokenMock,
  isPendingEmailChangeExpiredMock,
  knownRequestErrorCtor,
} = vi.hoisted(() => {
  const hashPendingEmailChangeTokenMock = vi.fn();
  const isPendingEmailChangeExpiredMock = vi.fn();

  class KnownRequestError extends Error {
    code: string;

    constructor(code: string) {
      super("Prisma error");
      this.code = code;
    }
  }

  const txMock = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pendingEmailChange: {
      delete: vi.fn(),
    },
  };

  const prismaClientMock = {
    pendingEmailChange: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<void>) =>
      fn(txMock),
    ),
    __tx: txMock,
  };

  return {
    prismaClientMock,
    hashPendingEmailChangeTokenMock,
    isPendingEmailChangeExpiredMock,
    knownRequestErrorCtor: KnownRequestError,
  };
});

vi.mock("@/generated/prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: knownRequestErrorCtor,
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaClientMock }));

vi.mock("@/lib/pending-email-change-token", () => ({
  hashPendingEmailChangeToken: hashPendingEmailChangeTokenMock,
  isPendingEmailChangeExpired: isPendingEmailChangeExpiredMock,
}));

const { POST } = await import("./route");

describe("/api/account/email-change/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    hashPendingEmailChangeTokenMock.mockReturnValue("hashed-token");
    isPendingEmailChangeExpiredMock.mockReturnValue(false);

    prismaClientMock.pendingEmailChange.findUnique.mockResolvedValue({
      id: "pec1",
      userId: "u1",
      newEmail: "new@example.com",
      expiresAt: new Date("2026-05-21T00:00:00.000Z"),
    });

    prismaClientMock.__tx.user.findUnique.mockResolvedValue(null);
    prismaClientMock.__tx.user.update.mockResolvedValue({ id: "u1" });
    prismaClientMock.__tx.pendingEmailChange.delete.mockResolvedValue({
      id: "pec1",
    });

    prismaClientMock.pendingEmailChange.delete.mockResolvedValue({
      id: "pec1",
    });
  });

  it("returns 400 for malformed token payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change/verify",
      {
        method: "POST",
        body: JSON.stringify({ token: "x" }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_CHANGE_TOKEN_INVALID",
    });
  });

  it("returns 404 when pending token is not found", async () => {
    prismaClientMock.pendingEmailChange.findUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/account/email-change/verify",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_CHANGE_TOKEN_INVALID",
    });
  });

  it("returns 410 and removes token when pending request is expired", async () => {
    isPendingEmailChangeExpiredMock.mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost/api/account/email-change/verify",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_CHANGE_TOKEN_EXPIRED",
    });
    expect(prismaClientMock.pendingEmailChange.delete).toHaveBeenCalledWith({
      where: { id: "pec1" },
    });
  });

  it("returns 409 when target email is already in use", async () => {
    prismaClientMock.__tx.user.findUnique.mockResolvedValue({ id: "u-other" });

    const request = new NextRequest(
      "http://localhost/api/account/email-change/verify",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_EMAIL_IN_USE",
    });
  });

  it("updates user email and deletes pending request on success", async () => {
    const request = new NextRequest(
      "http://localhost/api/account/email-change/verify",
      {
        method: "POST",
        body: JSON.stringify({ token: "valid-token" }),
        headers: { "Content-Type": "application/json" },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaClientMock.__tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        email: "new@example.com",
        emailVerified: true,
      },
    });
    expect(
      prismaClientMock.__tx.pendingEmailChange.delete,
    ).toHaveBeenCalledWith({
      where: { id: "pec1" },
    });
  });
});
