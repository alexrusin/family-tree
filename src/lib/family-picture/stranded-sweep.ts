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
    updateMany: (args: {
      where: {
        status: "pending";
        createdAt: { lt: Date };
      };
      data: { status: "failed"; errorMessage: string };
    }) => Promise<{ count: number }>;
  };
}

/**
 * Fails any `pending` Generation older than the threshold. Cheap to call at
 * the top of read paths (list/poll) rather than running a separate worker —
 * there's no queue/cron in v1, so this is what actually recovers stranded
 * rows after a container restart.
 */
export async function sweepStrandedGenerations(
  prisma: StrandedSweepPrisma,
  now: Date = new Date(),
  thresholdMinutes: number = STRANDED_GENERATION_THRESHOLD_MINUTES,
): Promise<number> {
  const cutoff = new Date(now.getTime() - thresholdMinutes * 60 * 1000);
  const result = await prisma.generation.updateMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    data: { status: "failed", errorMessage: "ERR_GENERATION_STRANDED" },
  });
  return result.count;
}
