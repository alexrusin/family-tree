/**
 * Per-user monthly cap on Generations (matches the approved UI mockup's "of
 * 10"). A future subscription tier or purchased credits can raise this via a
 * persisted grant without changing the ledger model — see `allowance.ts`.
 */
export const MONTHLY_GENERATION_ALLOWANCE = 10;

/** UTC calendar-month key (e.g. "2026-07") scoping ledger rows to the current cap period. */
export function currentPeriodKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** First moment (UTC) of the month after `now` — when the cap next resets. */
export function nextPeriodResetAt(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/** First moment (UTC) of `now`'s own month — the start of the current cap period. */
export function currentPeriodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}
