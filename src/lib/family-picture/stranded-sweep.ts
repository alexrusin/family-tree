/** Minutes a `pending` Generation may sit before it's considered stranded (e.g. by a container restart). */
export const STRANDED_GENERATION_THRESHOLD_MINUTES = 15;

/** Pure predicate: has this pending Generation sat long enough to be considered stranded? */
export function isStrandedGeneration(
  createdAt: Date,
  now: Date,
  thresholdMinutes: number = STRANDED_GENERATION_THRESHOLD_MINUTES,
): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= thresholdMinutes * 60 * 1000;
}

export interface StrandedSweepPrisma {
  generation: {
    findMany: (args: {
      where: {
        status: "pending";
        createdAt: { lt: Date };
      };
      select: { id: true };
    }) => Promise<{ id: string }[]>;
    updateMany: (args: {
      where: {
        id: string;
        status: "pending";
      };
      data: { status: "failed"; errorMessage: string };
    }) => Promise<{ count: number }>;
  };
}

/**
 * Fails any `pending` Generation older than the threshold and refunds its
 * held allowance slot. Cheap to call at the top of read paths (list/poll)
 * rather than running a separate worker — there's no queue/cron in v1, so
 * this is what actually recovers stranded rows after a container restart.
 *
 * A stranded Generation died before its orchestrator could consume or refund
 * the reservation it holds, so without the refund the User silently loses that
 * monthly slot forever (PRD: stranded Generations are failed *and refunded*).
 * `refundReservation` is injected so this module stays free of the ledger's
 * Prisma shape and testable with fakes.
 */
export async function sweepStrandedGenerations(
  prisma: StrandedSweepPrisma,
  refundReservation: (reservationId: string) => Promise<void>,
  now: Date = new Date(),
  thresholdMinutes: number = STRANDED_GENERATION_THRESHOLD_MINUTES,
): Promise<number> {
  const cutoff = new Date(now.getTime() - thresholdMinutes * 60 * 1000);
  const stranded = await prisma.generation.findMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    select: { id: true },
  });

  let swept = 0;
  for (const { id } of stranded) {
    // Conditional pending -> failed transition: only the sweep that actually
    // flips the row refunds it, so a Generation completing concurrently — or a
    // second sweep on a parallel read request — can never double-refund.
    const { count } = await prisma.generation.updateMany({
      where: { id, status: "pending" },
      data: { status: "failed", errorMessage: "ERR_GENERATION_STRANDED" },
    });
    if (count === 0) {
      continue;
    }
    // The Generation id is the allowance reservationId (routes create the row
    // with `id: reservationId`), so its still-open reservation refunds here.
    // Cleanup runs on a read path, so a refund hiccup must never 500 the read.
    try {
      await refundReservation(id);
    } catch {
      // Reservation already finalized by a racing path — the slot is settled.
    }
    swept += 1;
  }
  return swept;
}
