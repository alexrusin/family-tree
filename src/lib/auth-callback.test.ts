import { describe, expect, it } from "vitest";
import { resolvePostAuthRedirect } from "./auth-callback";

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
