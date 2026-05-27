import { describe, expect, it } from "vitest";
import {
  buildPostVerificationRedirect,
  resolvePostAuthRedirect,
} from "./auth-callback";

describe("resolvePostAuthRedirect", () => {
  it("returns safe locale-prefixed callback", () => {
    expect(resolvePostAuthRedirect("en", "/en/invitations/accept/token")).toBe(
      "/en/invitations/accept/token",
    );
    expect(resolvePostAuthRedirect("en", "/ru/invitations/accept/token")).toBe(
      "/ru/invitations/accept/token",
    );
  });

  it("preserves callback query and hash", () => {
    expect(
      resolvePostAuthRedirect(
        "en",
        "/en/invitations/accept/token?from=email#section",
      ),
    ).toBe("/en/invitations/accept/token?from=email#section");
  });

  it("falls back for missing callback", () => {
    expect(resolvePostAuthRedirect("en", null)).toBe("/en/dashboard");
    expect(resolvePostAuthRedirect("ru", "")).toBe("/ru/dashboard");
  });

  it("falls back for non-local and malformed callback", () => {
    expect(resolvePostAuthRedirect("en", "https://evil.com")).toBe(
      "/en/dashboard",
    );
    expect(resolvePostAuthRedirect("en", "//evil.com/path")).toBe(
      "/en/dashboard",
    );
    expect(resolvePostAuthRedirect("en", "/dashboard")).toBe("/en/dashboard");
    expect(resolvePostAuthRedirect("en", "/en\\n/dashboard")).toBe(
      "/en/dashboard",
    );
  });
});

describe("buildPostVerificationRedirect", () => {
  it("preserves explicit callbacks without adding welcome state", () => {
    expect(
      buildPostVerificationRedirect("en", "/en/invitations/accept/token"),
    ).toBe("/en/invitations/accept/token");
    expect(buildPostVerificationRedirect("en", "/en/dashboard")).toBe(
      "/en/dashboard",
    );
  });

  it("falls back to dashboard welcome state when callback is missing", () => {
    expect(buildPostVerificationRedirect("en", null)).toBe(
      "/en/dashboard?emailVerified=1&welcome=create-tree",
    );
    expect(buildPostVerificationRedirect("ru", "")).toBe(
      "/ru/dashboard?emailVerified=1&welcome=create-tree",
    );
  });

  it("falls back to dashboard welcome state for unsafe callbacks", () => {
    expect(buildPostVerificationRedirect("en", "https://evil.com")).toBe(
      "/en/dashboard?emailVerified=1&welcome=create-tree",
    );
  });
});
