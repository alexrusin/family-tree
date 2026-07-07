export type LedgerEntryKind = "grant" | "reservation" | "consumption" | "refund";

export interface GrantEntry {
  kind: "grant";
  amount: number;
}

export interface ReservationEntry {
  kind: "reservation";
  id: string;
}

export interface ConsumptionEntry {
  kind: "consumption";
  reservationId: string;
}

export interface RefundEntry {
  kind: "refund";
  reservationId: string;
}

export type LedgerEntry =
  | GrantEntry
  | ReservationEntry
  | ConsumptionEntry
  | RefundEntry;

/**
 * Generations remaining for a User: grants add, a reservation holds one
 * pending a consume/refund outcome, a consumption finalizes that hold (no
 * further change), and a refund releases it.
 */
export function balance(entries: readonly LedgerEntry[]): number {
  return entries.reduce((total, entry) => {
    switch (entry.kind) {
      case "grant":
        return total + entry.amount;
      case "reservation":
        return total - 1;
      case "refund":
        return total + 1;
      case "consumption":
        return total;
    }
  }, 0);
}

export function canReserve(entries: readonly LedgerEntry[]): boolean {
  return balance(entries) > 0;
}

function requireOpenReservation(
  entries: readonly LedgerEntry[],
  reservationId: string,
): void {
  const reserved = entries.some(
    (entry) => entry.kind === "reservation" && entry.id === reservationId,
  );
  if (!reserved) {
    throw new Error("ERR_UNKNOWN_RESERVATION");
  }

  const finalized = entries.some(
    (entry) =>
      (entry.kind === "consumption" || entry.kind === "refund") &&
      entry.reservationId === reservationId,
  );
  if (finalized) {
    throw new Error("ERR_RESERVATION_ALREADY_FINALIZED");
  }
}

/**
 * Appends a reservation for `reservationId`, holding one generation against
 * the balance. Throws if the balance is not positive, so that two
 * reservations racing against the same snapshot can't both succeed and push
 * the balance below zero.
 */
export function reserve(
  entries: readonly LedgerEntry[],
  reservationId: string,
): LedgerEntry[] {
  if (!canReserve(entries)) {
    throw new Error("ERR_ALLOWANCE_EXHAUSTED");
  }
  return [...entries, { kind: "reservation", id: reservationId }];
}

/** Finalizes a reservation as a consumption (on generation success). */
export function consume(
  entries: readonly LedgerEntry[],
  reservationId: string,
): LedgerEntry[] {
  requireOpenReservation(entries, reservationId);
  return [...entries, { kind: "consumption", reservationId }];
}

/** Finalizes a reservation as a refund (on failure/refusal); nets to zero. */
export function refund(
  entries: readonly LedgerEntry[],
  reservationId: string,
): LedgerEntry[] {
  requireOpenReservation(entries, reservationId);
  return [...entries, { kind: "refund", reservationId }];
}
