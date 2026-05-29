const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDisplayNameInput(displayName: string): string | null {
  if (displayName.trim().length === 0) {
    return "ERR_INVALID_DISPLAY_NAME";
  }

  return null;
}

export function validateAvatarSelection(input: {
  sizeBytes: number;
  contentType: string;
}): string | null {
  if (!SUPPORTED_AVATAR_TYPES.includes(input.contentType)) {
    return "ERR_UNSUPPORTED_IMAGE_TYPE";
  }

  if (input.sizeBytes > MAX_AVATAR_BYTES) {
    return "ERR_IMAGE_TOO_LARGE";
  }

  return null;
}

export function validateAccountEmailInput(
  email: string,
  currentEmail: string,
): string | null {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return "ERR_INVALID_EMAIL";
  }

  if (normalized === currentEmail.trim().toLowerCase()) {
    return "ERR_EMAIL_UNCHANGED";
  }

  return null;
}
