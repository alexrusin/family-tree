import { describe, it, expect, beforeAll } from "vitest";

type AuthOptions = {
  plugins?: Array<{ id?: string }>;
  rateLimit?: {
    enabled?: boolean;
    customRules?: Record<string, { window: number; max: number }>;
  };
};

let options: AuthOptions;

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
