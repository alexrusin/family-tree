import { auth } from "@/lib/auth";
import { withSession } from "@/lib/with-session";
import { meetsPasswordPolicy } from "@/lib/password-policy";
import { appendSetCookieHeaders } from "@/lib/set-cookie-utils";

interface BetterAuthErrorPayload {
  code?: string;
}

function mapBetterAuthError(
  payload: BetterAuthErrorPayload | null,
  status: number,
): { errorCode: string; status: number } {
  switch (payload?.code) {
    case "INVALID_PASSWORD":
      return { errorCode: "ERR_INVALID_CURRENT_PASSWORD", status: 400 };
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return { errorCode: "ERR_WEAK_PASSWORD", status: 400 };
    case "UNAUTHORIZED":
      return { errorCode: "ERR_UNAUTHORIZED", status: 401 };
    default:
      if (status === 401) {
        return { errorCode: "ERR_UNAUTHORIZED", status: 401 };
      }

      return { errorCode: "ERR_INTERNAL", status: 500 };
  }
}

export const PATCH = withSession(async ({ request }) => {
  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;

  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (currentPassword.trim().length === 0) {
    return Response.json(
      { errorCode: "ERR_CURRENT_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  if (newPassword.length === 0) {
    return Response.json(
      { errorCode: "ERR_NEW_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  if (!meetsPasswordPolicy(newPassword)) {
    return Response.json(
      { errorCode: "ERR_WEAK_PASSWORD" },
      { status: 400 },
    );
  }

  const response = await auth.api.changePassword({
    headers: request.headers,
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    asResponse: true,
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as BetterAuthErrorPayload | null;
    const mappedError = mapBetterAuthError(payload, response.status);

    return Response.json(
      { errorCode: mappedError.errorCode },
      { status: mappedError.status },
    );
  }

  const successResponse = Response.json({ status: true });
  appendSetCookieHeaders(response.headers, successResponse.headers);
  return successResponse;
});
