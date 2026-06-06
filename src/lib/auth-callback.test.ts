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
    expect(resolvePostAuthRedirect("es", "/es/invitations/accept/token")).toBe(
      "/es/invitations/accept/token",
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
    expect(resolvePostAuthRedirect("es", null)).toBe("/es/dashboard");
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
    expect(resolvePostAuthRedirect("es", "/dashboard")).toBe("/es/dashboard");
  });
});

describe("buildPostVerificationRedirect", () => {
  it("always redirects to the localized dashboard with only emailVerified", () => {
    expect(buildPostVerificationRedirect("en")).toBe(
      "/en/dashboard?emailVerified=1",
    );
    expect(buildPostVerificationRedirect("ru")).toBe(
      "/ru/dashboard?emailVerified=1",
    );
    expect(buildPostVerificationRedirect("es")).toBe(
      "/es/dashboard?emailVerified=1",
    );
  });

  it("falls back to the default locale for unsupported languages", () => {
    expect(buildPostVerificationRedirect("de")).toBe(
      "/en/dashboard?emailVerified=1",
    );
  });
});
