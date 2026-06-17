import { describe, it, expect } from "vitest";
import {
  initialMemberFormState,
  validateMemberPhotoSelection,
} from "./member-form-state";

describe("member form state", () => {
  it("defaults isLiving to true", () => {
    expect(initialMemberFormState().isLiving).toBe(true);
  });

  it("defaults maidenName to empty string", () => {
    expect(initialMemberFormState().maidenName).toBe("");
  });

  it("rejects files over 5mb", () => {
    const error = validateMemberPhotoSelection({
      sizeBytes: 6 * 1024 * 1024,
      contentType: "image/png",
    });

    expect(error).toBe("ERR_IMAGE_TOO_LARGE");
  });
});
