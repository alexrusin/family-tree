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

const { GET, PATCH } = await import("./route");

describe("/api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    prismaClientMock.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      image: "https://example.com/alex.webp",
      pendingEmailChange: null,
    });

    prismaClientMock.user.update.mockResolvedValue({
      id: "u1",
      name: "Alex Updated",
      email: "alex@example.com",
      image: "https://example.com/alex.webp",
      pendingEmailChange: null,
    });
  });

  it("returns 401 for unauthenticated GET", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/account", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns account profile for authenticated GET", async () => {
    const request = new NextRequest("http://localhost/api/account", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex",
        email: "alex@example.com",
        avatarUrl: "https://example.com/alex.webp",
        pendingEmailChange: null,
      },
    });
  });

  it("returns 400 when display name is blank", async () => {
    const request = new NextRequest("http://localhost/api/account", {
      method: "PATCH",
      body: JSON.stringify({ displayName: "   " }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_DISPLAY_NAME",
    });
    expect(prismaClientMock.user.update).not.toHaveBeenCalled();
  });

  it("updates display name for authenticated PATCH", async () => {
    const request = new NextRequest("http://localhost/api/account", {
      method: "PATCH",
      body: JSON.stringify({ displayName: " Alex Updated " }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex Updated",
        email: "alex@example.com",
        avatarUrl: "https://example.com/alex.webp",
        pendingEmailChange: null,
      },
    });
    expect(prismaClientMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Alex Updated" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });
  });
});
