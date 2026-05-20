import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE";

interface BetterAuthErrorPayload {
  code?: string;
}

function mapDeleteError(
  payload: BetterAuthErrorPayload | null,
  status: number,
): { errorCode: string; status: number } {
  switch (payload?.code) {
    case "INVALID_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return { errorCode: "ERR_INVALID_CURRENT_PASSWORD", status: 400 };
    case "UNAUTHORIZED":
    case "SESSION_EXPIRED":
      return { errorCode: "ERR_UNAUTHORIZED", status: 401 };
    default:
      if (status === 401) {
        return { errorCode: "ERR_UNAUTHORIZED", status: 401 };
      }

      return { errorCode: "ERR_ACCOUNT_DELETE_FAILED", status: 500 };
  }
}

function appendSetCookieHeaders(source: Headers, target: Headers): void {
  const sourceWithGetSetCookie = source as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof sourceWithGetSetCookie.getSetCookie === "function") {
    const cookies = sourceWithGetSetCookie.getSetCookie();
    for (const cookie of cookies) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const fallbackSetCookie = source.get("set-cookie");
  if (fallbackSetCookie) {
    target.append("set-cookie", fallbackSetCookie);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      currentPassword?: unknown;
      confirmationPhrase?: unknown;
    } | null;

    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const confirmationPhrase =
      typeof body?.confirmationPhrase === "string"
        ? body.confirmationPhrase
        : "";

    if (currentPassword.trim().length === 0) {
      return NextResponse.json(
        { errorCode: "ERR_CURRENT_PASSWORD_REQUIRED" },
        { status: 400 },
      );
    }

    if (confirmationPhrase.length === 0) {
      return NextResponse.json(
        { errorCode: "ERR_DELETE_CONFIRMATION_REQUIRED" },
        { status: 400 },
      );
    }

    if (confirmationPhrase !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
      return NextResponse.json(
        { errorCode: "ERR_DELETE_CONFIRMATION_MISMATCH" },
        { status: 400 },
      );
    }

    const response = await auth.api.deleteUser({
      headers: request.headers,
      body: {
        password: currentPassword,
      },
      asResponse: true,
    });

    if (!response.ok) {
      const payload = (await response
        .json()
        .catch(() => null)) as BetterAuthErrorPayload | null;
      const mappedError = mapDeleteError(payload, response.status);

      return NextResponse.json(
        { errorCode: mappedError.errorCode },
        { status: mappedError.status },
      );
    }

    const successResponse = NextResponse.json(
      { status: true },
      { status: 200 },
    );
    appendSetCookieHeaders(response.headers, successResponse.headers);
    return successResponse;
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { errorCode: "ERR_ACCOUNT_DELETE_FAILED" },
      { status: 500 },
    );
  }
}
