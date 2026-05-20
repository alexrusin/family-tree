import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaClientMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaClientMock = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    getSessionMock,
    prismaClientMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaClientMock }));

const { PATCH } = await import("./route");

describe("/api/account/locale", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaClientMock.user.update.mockResolvedValue({ locale: "ru" });
  });

  it("returns 401 for unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/account/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "ru" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 for invalid locale", async () => {
    const request = new NextRequest("http://localhost/api/account/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "de" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_LOCALE",
    });
    expect(prismaClientMock.user.update).not.toHaveBeenCalled();
  });

  it("returns 404 when user does not exist", async () => {
    prismaClientMock.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/account/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "ru" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_USER_NOT_FOUND",
    });
  });

  it("persists locale for authenticated users", async () => {
    const request = new NextRequest("http://localhost/api/account/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "ru" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ locale: "ru" });
    expect(prismaClientMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { locale: "ru" },
      select: { locale: true },
    });
  });
});
