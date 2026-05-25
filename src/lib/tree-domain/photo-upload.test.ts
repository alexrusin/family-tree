import { afterEach, beforeEach, describe, it, expect } from "vitest";
import {
  createS3Client,
  photoPublicUrl,
  validatePhotoFile,
} from "./photo-upload";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

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

describe("photoPublicUrl", () => {
  it("uses AWS_REGION when S3_REGION is not set", () => {
    process.env.S3_BUCKET = "alex-generations-app";
    delete process.env.S3_REGION;
    process.env.AWS_REGION = "us-west-2";

    expect(photoPublicUrl("avatars/u1.webp")).toBe(
      "https://alex-generations-app.s3.us-west-2.amazonaws.com/avatars/u1.webp",
    );
  });

  it("prefers S3_REGION over AWS_REGION", () => {
    process.env.S3_BUCKET = "alex-generations-app";
    process.env.S3_REGION = "eu-west-1";
    process.env.AWS_REGION = "us-west-2";

    expect(photoPublicUrl("avatars/u1.webp")).toBe(
      "https://alex-generations-app.s3.eu-west-1.amazonaws.com/avatars/u1.webp",
    );
  });
});

describe("createS3Client", () => {
  it("includes AWS_SESSION_TOKEN for temporary credentials", async () => {
    process.env.AWS_ACCESS_KEY_ID = "ASIAEXAMPLE123";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_SESSION_TOKEN = "session-token";

    const s3 = createS3Client();
    const credentials =
      typeof s3.config.credentials === "function"
        ? await s3.config.credentials()
        : s3.config.credentials;

    expect(credentials?.accessKeyId).toBe("ASIAEXAMPLE123");
    expect(credentials?.secretAccessKey).toBe("secret");
    expect(credentials?.sessionToken).toBe("session-token");
  });
});
