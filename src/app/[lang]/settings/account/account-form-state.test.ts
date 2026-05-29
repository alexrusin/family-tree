import { describe, expect, it } from "vitest";
import {
  validateAccountEmailInput,
  validateAvatarSelection,
  validateDisplayNameInput,
} from "./account-form-state";

describe("account form state", () => {
  it("rejects blank display names", () => {
    const errorCode = validateDisplayNameInput("   ");
    expect(errorCode).toBe("ERR_INVALID_DISPLAY_NAME");
  });

  it("accepts valid display names", () => {
    const errorCode = validateDisplayNameInput("Alex");
    expect(errorCode).toBeNull();
  });

  it("rejects unsupported avatar mime types", () => {
    const errorCode = validateAvatarSelection({
      sizeBytes: 1024,
      contentType: "image/gif",
    });

    expect(errorCode).toBe("ERR_UNSUPPORTED_IMAGE_TYPE");
  });

  it("rejects avatars over 5 MB", () => {
    const errorCode = validateAvatarSelection({
      sizeBytes: 6 * 1024 * 1024,
      contentType: "image/png",
    });

    expect(errorCode).toBe("ERR_IMAGE_TOO_LARGE");
  });

  it("rejects invalid account emails", () => {
    const errorCode = validateAccountEmailInput("abc", "alex@example.com");
    expect(errorCode).toBe("ERR_INVALID_EMAIL");
  });

  it("rejects unchanged account emails", () => {
    const errorCode = validateAccountEmailInput(
      " Alex@Example.com ",
      "alex@example.com",
    );
    expect(errorCode).toBe("ERR_EMAIL_UNCHANGED");
  });

  it("accepts new account emails", () => {
    const errorCode = validateAccountEmailInput(
      "new@example.com",
      "alex@example.com",
    );
    expect(errorCode).toBeNull();
  });
});
