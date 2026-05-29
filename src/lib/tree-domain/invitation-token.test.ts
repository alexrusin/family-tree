import { describe, it, expect } from "vitest";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isInvitationExpired,
} from "./invitation-token";

describe("invitation-token", () => {
  it("generates url-safe high-entropy tokens", () => {
    const token = generateInvitationToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });

  it("hashes deterministically", () => {
    const h1 = hashInvitationToken("abc");
    const h2 = hashInvitationToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sets default expiry to 7 days", () => {
    const now = new Date("2026-05-14T00:00:00.000Z");
    const expiresAt = invitationExpiresAt(now);
    expect(expiresAt.toISOString()).toBe("2026-05-21T00:00:00.000Z");
    expect(isInvitationExpired(expiresAt, now)).toBe(false);
    expect(
      isInvitationExpired(expiresAt, new Date("2026-05-22T00:00:00.000Z")),
    ).toBe(true);
  });
});
