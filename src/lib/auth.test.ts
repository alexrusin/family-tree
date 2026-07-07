import { describe, it, expect, beforeAll, vi } from "vitest";

type AuthOptions = {
  plugins?: Array<{ id?: string }>;
  rateLimit?: {
    enabled?: boolean;
    customRules?: Record<string, { window: number; max: number }>;
  };
  user?: {
    deleteUser?: {
      enabled?: boolean;
      beforeDelete?: (user: { id: string }) => Promise<void>;
    };
  };
};

let options: AuthOptions;

const deleteFamilyPictureImagesForUserMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/family-picture/user-deletion", () => ({
  deleteFamilyPictureImagesForUser: deleteFamilyPictureImagesForUserMock,
}));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: vi.fn(() => ({})),
  deletePhotoByKey: vi.fn(),
}));

// auth.ts reads env at import time and pulls in the generated Prisma client,
// which is slow to cold-load — set env and import once with a generous timeout.
beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-32";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.DATABASE_URL ??=
    "postgresql://user:pass@localhost:5432/test?schema=public";
  process.env.TURNSTILE_SECRET_KEY ??= "test-turnstile-secret";

  const { auth } = await import("./auth");
  options = auth.options as AuthOptions;
}, 30000);

describe("auth bot-protection config", () => {
  it("registers the captcha plugin scoped to sign-up and forget-password", () => {
    const captchaPlugin = options.plugins?.find((p) => p.id === "captcha");
    expect(captchaPlugin).toBeDefined();
  });

  it("applies strict rate-limit rules to the abused endpoints", () => {
    expect(options.rateLimit?.enabled).toBe(true);
    expect(options.rateLimit?.customRules?.["/sign-up/email"]).toEqual({
      window: 3600,
      max: 5,
    });
    expect(options.rateLimit?.customRules?.["/forget-password"]).toEqual({
      window: 3600,
      max: 5,
    });
  });
});

describe("auth account-deletion lifecycle", () => {
  it("cleans up Family Picture S3 images before the User row (and its cascades) are deleted", async () => {
    const beforeDelete = options.user?.deleteUser?.beforeDelete;
    expect(typeof beforeDelete).toBe("function");

    deleteFamilyPictureImagesForUserMock.mockClear();
    await beforeDelete!({ id: "user-1" });

    expect(deleteFamilyPictureImagesForUserMock).toHaveBeenCalledTimes(1);
    expect(deleteFamilyPictureImagesForUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ deletePhoto: expect.any(Function) }),
      "user-1",
    );
  });
});
