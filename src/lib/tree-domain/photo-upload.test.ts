import { describe, it, expect } from "vitest";
import { validatePhotoFile } from "./photo-upload";

describe("validatePhotoFile", () => {
  it("accepts jpeg/png/webp under 5mb", () => {
    expect(() =>
      validatePhotoFile({
        contentType: "image/jpeg",
        sizeBytes: 1024 * 1024,
      }),
    ).not.toThrow();
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      validatePhotoFile({
        contentType: "image/gif",
        sizeBytes: 100,
      }),
    ).toThrow("ERR_UNSUPPORTED_IMAGE_TYPE");
  });

  it("rejects files over 5mb", () => {
    expect(() =>
      validatePhotoFile({
        contentType: "image/png",
        sizeBytes: 6 * 1024 * 1024,
      }),
    ).toThrow("ERR_IMAGE_TOO_LARGE");
  });
});
