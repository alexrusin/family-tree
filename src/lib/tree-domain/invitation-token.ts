import { createHash, randomBytes } from "crypto";

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(from: Date = new Date()): Date {
  const msInDay = 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + 7 * msInDay);
}

export function isInvitationExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() > expiresAt.getTime();
}
