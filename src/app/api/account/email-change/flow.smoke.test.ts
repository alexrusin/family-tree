import "dotenv/config";
import { randomUUID } from "crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const { getSessionMock, sendPendingEmailChangeEmailMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  sendPendingEmailChangeEmailMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/pending-email-change-email", () => ({
  sendPendingEmailChangeEmail: sendPendingEmailChangeEmailMock,
}));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const { POST: requestEmailChange } = await import("./route");
const { POST: verifyEmailChange } = await import("./verify/route");
const { GET: getAccountProfile } = await import("../route");

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.pendingEmailChange.deleteMany({
    where: {
      userId: {
        startsWith: "smoke-user-",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        startsWith: "smoke-user-",
      },
    },
  });
});

describe("pending email change smoke flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
  });

  it("requests email change, verifies token, and exposes updated account email", async () => {
    const userId = `smoke-user-${randomUUID()}`;
    const initialEmail = `${userId}@old.example.com`;
    const nextEmail = `${userId}@new.example.com`;
    const now = new Date();

    await prisma.user.create({
      data: {
        id: userId,
        email: initialEmail,
        name: "Smoke User",
        image: null,
        locale: "en",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    getSessionMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    sendPendingEmailChangeEmailMock.mockResolvedValue(undefined);

    const requestResponse = await requestEmailChange(
      new NextRequest("http://localhost/api/account/email-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: nextEmail,
          locale: "en",
        }),
      }),
    );

    expect(requestResponse.status).toBe(200);
    expect(sendPendingEmailChangeEmailMock).toHaveBeenCalledTimes(1);

    const verifyUrl = (
      sendPendingEmailChangeEmailMock.mock.calls[0]?.[0] as {
        verifyUrl: string;
      }
    ).verifyUrl;
    const token = verifyUrl.split("/").pop();
    expect(token).toBeTruthy();

    const verifyResponse = await verifyEmailChange(
      new NextRequest("http://localhost/api/account/email-change/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      }),
    );

    expect(verifyResponse.status).toBe(200);
    await expect(verifyResponse.json()).resolves.toEqual({ success: true });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });

    expect(updatedUser?.email).toBe(nextEmail);

    const pending = await prisma.pendingEmailChange.findUnique({
      where: { userId },
      select: { id: true },
    });
    expect(pending).toBeNull();

    const accountResponse = await getAccountProfile(
      new NextRequest("http://localhost/api/account", {
        method: "GET",
      }),
    );

    expect(accountResponse.status).toBe(200);
    await expect(accountResponse.json()).resolves.toMatchObject({
      profile: {
        email: nextEmail,
        pendingEmailChange: null,
      },
    });
  });
});
