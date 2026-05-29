export const INVITE_MESSAGE_MAX_LENGTH = 500;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteRole = "editor" | "viewer";

export type InviteValidationError =
  | "ERR_INVALID_EMAIL"
  | "ERR_INVALID_ROLE"
  | "ERR_MESSAGE_TOO_LONG";

export interface InviteInput {
  email: string;
  role: string;
  message: string;
}

export function isInviteRole(role: string): role is InviteRole {
  return role === "editor" || role === "viewer";
}

export function normalizeInviteInput(input: InviteInput): {
  email: string;
  role: string;
  message: string;
} {
  return {
    email: input.email.trim().toLowerCase(),
    role: input.role.trim(),
    message: input.message.trim(),
  };
}

export function validateInviteInput(
  input: InviteInput,
): InviteValidationError | null {
  const normalized = normalizeInviteInput(input);

  if (!EMAIL_REGEX.test(normalized.email)) {
    return "ERR_INVALID_EMAIL";
  }

  if (!isInviteRole(normalized.role)) {
    return "ERR_INVALID_ROLE";
  }

  if (normalized.message.length > INVITE_MESSAGE_MAX_LENGTH) {
    return "ERR_MESSAGE_TOO_LONG";
  }

  return null;
}
