import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, changePasswordMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const changePasswordMock = vi.fn();

  return {
    getSessionMock,
    changePasswordMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
      changePassword: changePasswordMock,
    },
  },
}));

const { PATCH } = await import("./route");

describe("PATCH /api/account/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    changePasswordMock.mockResolvedValue(
      new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: {
          "set-cookie":
            "better-auth.session_token=next-token; Path=/; HttpOnly",
        },
      }),
    );
  });

  it("returns 401 for unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/account/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "Family123",
      }),
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

  it("returns 400 when current password is missing", async () => {
    const request = new NextRequest("http://localhost/api/account/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: " ",
        newPassword: "Family123",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_CURRENT_PASSWORD_REQUIRED",
    });
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("returns 400 when new password is weak", async () => {
    const request = new NextRequest("http://localhost/api/account/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "allletters",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_WEAK_PASSWORD",
    });
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("maps invalid current password to structured error code", async () => {
    changePasswordMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "INVALID_PASSWORD" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new NextRequest("http://localhost/api/account/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "wrong-password",
        newPassword: "Family123",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_CURRENT_PASSWORD",
    });
  });

  it("changes password, revokes other sessions, and forwards set-cookie", async () => {
    const request = new NextRequest("http://localhost/api/account/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "Family123",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: true });
    expect(changePasswordMock).toHaveBeenCalledWith({
      headers: request.headers,
      body: {
        currentPassword: "old-password",
        newPassword: "Family123",
        revokeOtherSessions: true,
      },
      asResponse: true,
    });
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=next-token",
    );
  });
});
