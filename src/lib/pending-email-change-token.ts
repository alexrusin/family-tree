import { createHash, randomBytes } from "crypto";

const MS_IN_HOUR = 60 * 60 * 1000;

export function generatePendingEmailChangeToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPendingEmailChangeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function pendingEmailChangeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + 24 * MS_IN_HOUR);
}

export function isPendingEmailChangeExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() > expiresAt.getTime();
}
