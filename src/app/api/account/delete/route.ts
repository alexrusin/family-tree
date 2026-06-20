import { auth } from "@/lib/auth";
import { withSession } from "@/lib/with-session";
import { appendSetCookieHeaders } from "@/lib/set-cookie-utils";

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

export const DELETE = withSession(async ({ request }) => {
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
    return Response.json(
      { errorCode: "ERR_CURRENT_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  if (confirmationPhrase.length === 0) {
    return Response.json(
      { errorCode: "ERR_DELETE_CONFIRMATION_REQUIRED" },
      { status: 400 },
    );
  }

  if (confirmationPhrase !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
    return Response.json(
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

    return Response.json(
      { errorCode: mappedError.errorCode },
      { status: mappedError.status },
    );
  }

  const successResponse = Response.json({ status: true });
  appendSetCookieHeaders(response.headers, successResponse.headers);
  return successResponse;
});
