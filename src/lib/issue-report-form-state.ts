const MAX_DESCRIPTION_LENGTH = 2000;

export function validateDescriptionInput(description: string): string | null {
  if (description.trim().length === 0) {
    return "ERR_DESCRIPTION_REQUIRED";
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return "ERR_DESCRIPTION_TOO_LONG";
  }

  return null;
}
