import { balance, canReserve, consume, refund, type LedgerEntry } from "./allowance";
import {
  MONTHLY_GENERATION_ALLOWANCE,
  currentPeriodKey,
  nextPeriodResetAt,
} from "./allowance-period";

type StoredLedgerRow = {
  kind: "reservation" | "consumption" | "refund";
  reservationId: string;
};

function toLedgerEntry(row: StoredLedgerRow): LedgerEntry {
  switch (row.kind) {
    case "reservation":
      return { kind: "reservation", id: row.reservationId };
    case "consumption":
      return { kind: "consumption", reservationId: row.reservationId };
    case "refund":
      return { kind: "refund", reservationId: row.reservationId };
  }
}

/**
 * Narrow shape of the Prisma delegate this adapter needs — like
 * `StrandedSweepPrisma`, so tests supply an in-memory fake instead of a real
 * database.
 */
export interface AllowanceLedgerPrisma {
  generationLedgerEntry: {
    findMany: (args: {
      where: { userId: string; periodKey: string };
      orderBy: { createdAt: "asc" };
    }) => Promise<StoredLedgerRow[]>;
    findFirst: (args: {
      where: { reservationId: string; kind: "reservation" };
      select: { userId: true; periodKey: true };
    }) => Promise<{ userId: string; periodKey: string } | null>;
    create: (args: {
      data: {
        userId: string;
        periodKey: string;
        kind: "reservation" | "consumption" | "refund";
        reservationId: string;
      };
    }) => Promise<unknown>;
  };
}

export interface AllowanceStatus {
  remaining: number;
  resetAt: Date;
}

export interface ReservationOutcome {
  ok: boolean;
  resetAt: Date;
}

// Per-user in-process lock chain. v1 runs generation in-process with no
// external queue (see PRD), so serializing reserve calls per user here is
// what actually closes the race where parallel requests could both observe
// room under the cap and both reserve.
const userReservationLocks = new Map<string, Promise<unknown>>();

function withUserLock<T>(userId: string, run: () => Promise<T>): Promise<T> {
  const previous = userReservationLocks.get(userId) ?? Promise.resolve();
  const chained = previous.catch(() => undefined).then(run);
  userReservationLocks.set(userId, chained.catch(() => undefined));
  return chained;
}

async function loadPeriodEntries(
  prisma: AllowanceLedgerPrisma,
  userId: string,
  periodKey: string,
): Promise<LedgerEntry[]> {
  const rows = await prisma.generationLedgerEntry.findMany({
    where: { userId, periodKey },
    orderBy: { createdAt: "asc" },
  });
  return [
    { kind: "grant", amount: MONTHLY_GENERATION_ALLOWANCE },
    ...rows.map(toLedgerEntry),
  ];
}

/** Read-only balance check for display (e.g. the remaining-generations indicator). */
export async function getAllowanceStatus(
  prisma: AllowanceLedgerPrisma,
  userId: string,
  now: Date = new Date(),
): Promise<AllowanceStatus> {
  const entries = await loadPeriodEntries(prisma, userId, currentPeriodKey(now));
  return { remaining: balance(entries), resetAt: nextPeriodResetAt(now) };
}

/**
 * Reserves one Generation against the user's monthly allowance, or reports
 * the cap as reached along with the reset time. Serialized per user so
 * concurrent requests can't both pass the check and both reserve past the
 * cap.
 */
export function reserveGenerationAllowance(
  prisma: AllowanceLedgerPrisma,
  userId: string,
  reservationId: string,
  now: Date = new Date(),
): Promise<ReservationOutcome> {
  return withUserLock(userId, async () => {
    const periodKey = currentPeriodKey(now);
    const resetAt = nextPeriodResetAt(now);
    const entries = await loadPeriodEntries(prisma, userId, periodKey);
    if (!canReserve(entries)) {
      return { ok: false, resetAt };
    }
    await prisma.generationLedgerEntry.create({
      data: { userId, periodKey, kind: "reservation", reservationId },
    });
    return { ok: true, resetAt };
  });
}

async function finalizeReservation(
  prisma: AllowanceLedgerPrisma,
  reservationId: string,
  kind: "consumption" | "refund",
  apply: (entries: readonly LedgerEntry[], reservationId: string) => LedgerEntry[],
): Promise<void> {
  const scope = await prisma.generationLedgerEntry.findFirst({
    where: { reservationId, kind: "reservation" },
    select: { userId: true, periodKey: true },
  });
  if (!scope) {
    throw new Error("ERR_UNKNOWN_RESERVATION");
  }
  const entries = await loadPeriodEntries(prisma, scope.userId, scope.periodKey);
  apply(entries, reservationId); // validates the transition; throws if already finalized
  await prisma.generationLedgerEntry.create({
    data: { userId: scope.userId, periodKey: scope.periodKey, kind, reservationId },
  });
}

/** Converts an open reservation into a consumption (on generation success). */
export function consumeGenerationAllowance(
  prisma: AllowanceLedgerPrisma,
  reservationId: string,
): Promise<void> {
  return finalizeReservation(prisma, reservationId, "consumption", consume);
}

/** Converts an open reservation into a refund (on generation failure/refusal). */
export function refundGenerationAllowance(
  prisma: AllowanceLedgerPrisma,
  reservationId: string,
): Promise<void> {
  return finalizeReservation(prisma, reservationId, "refund", refund);
}
