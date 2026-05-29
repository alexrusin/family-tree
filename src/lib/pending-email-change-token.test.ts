import { describe, expect, it } from "vitest";
import {
  generatePendingEmailChangeToken,
  hashPendingEmailChangeToken,
  isPendingEmailChangeExpired,
  pendingEmailChangeExpiresAt,
} from "./pending-email-change-token";

describe("pending-email-change-token", () => {
  it("generates url-safe high-entropy tokens", () => {
    const token = generatePendingEmailChangeToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });

  it("hashes deterministically", () => {
    const h1 = hashPendingEmailChangeToken("abc");
    const h2 = hashPendingEmailChangeToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets default expiry to 24 hours", () => {
    const now = new Date("2026-05-20T00:00:00.000Z");
    const expiresAt = pendingEmailChangeExpiresAt(now);
    expect(expiresAt.toISOString()).toBe("2026-05-21T00:00:00.000Z");
    expect(isPendingEmailChangeExpired(expiresAt, now)).toBe(false);
    expect(
      isPendingEmailChangeExpired(
        expiresAt,
        new Date("2026-05-21T00:00:01.000Z"),
      ),
    ).toBe(true);
  });
});
