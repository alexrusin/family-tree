import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, deleteUserMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const deleteUserMock = vi.fn();

  return {
    getSessionMock,
    deleteUserMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
      deleteUser: deleteUserMock,
    },
  },
}));

const { DELETE } = await import("./route");

describe("DELETE /api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    deleteUserMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "User deleted" }), {
        status: 200,
        headers: {
          "set-cookie":
            "better-auth.session_token=; Path=/; HttpOnly; Max-Age=0",
        },
      }),
    );
  });

  it("returns 401 for unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "password123",
        confirmationPhrase: "DELETE",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 when current password is missing", async () => {
    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "  ",
        confirmationPhrase: "DELETE",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_CURRENT_PASSWORD_REQUIRED",
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmation phrase is missing", async () => {
    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "password123",
        confirmationPhrase: "",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_DELETE_CONFIRMATION_REQUIRED",
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("returns 400 when confirmation phrase does not match", async () => {
    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "password123",
        confirmationPhrase: "delete",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_DELETE_CONFIRMATION_MISMATCH",
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("maps invalid password from better-auth to structured error", async () => {
    deleteUserMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "INVALID_PASSWORD" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "wrong-password",
        confirmationPhrase: "DELETE",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_INVALID_CURRENT_PASSWORD",
    });
  });

  it("maps unknown deletion failures to account-delete error code", async () => {
    deleteUserMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "UNKNOWN" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "password123",
        confirmationPhrase: "DELETE",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_ACCOUNT_DELETE_FAILED",
    });
  });

  it("deletes account and forwards set-cookie headers", async () => {
    const request = new NextRequest("http://localhost/api/account/delete", {
      method: "DELETE",
      body: JSON.stringify({
        currentPassword: "password123",
        confirmationPhrase: "DELETE",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: true });
    expect(deleteUserMock).toHaveBeenCalledWith({
      headers: request.headers,
      body: {
        password: "password123",
      },
      asResponse: true,
    });
    expect(response.headers.get("set-cookie")).toContain(
      "better-auth.session_token=",
    );
  });
});
