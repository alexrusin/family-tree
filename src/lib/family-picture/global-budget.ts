import { resolveBudgetGuard, type BudgetGuardStatus } from "./budget-guard";
import { currentPeriodStart } from "./allowance-period";

/** Default operator ceiling, overridable via FAMILY_PICTURE_GENERATION_CEILING. */
const DEFAULT_GENERATION_CEILING = 2000;

/**
 * Narrow shape of the Prisma delegate this adapter needs, like
 * `AllowanceLedgerPrisma` — tests supply an in-memory fake instead of a real
 * database.
 */
export interface GlobalBudgetPrisma {
  generation: {
    count: (args: { where: { createdAt: { gte: Date } } }) => Promise<number>;
  };
}

/** The operator-configured ceiling on Generations for the current period. */
export function getGenerationCeiling(): number {
  const raw = process.env.FAMILY_PICTURE_GENERATION_CEILING;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GENERATION_CEILING;
}

/**
 * Global budget kill-switch status for the current period: counts every
 * Generation (one per billed model call) created across all users since the
 * period started, and runs it through the pure budget guard against the
 * operator's configured ceiling.
 */
export async function getGlobalBudgetStatus(
  prisma: GlobalBudgetPrisma,
  now: Date = new Date(),
): Promise<BudgetGuardStatus> {
  const periodTotal = await prisma.generation.count({
    where: { createdAt: { gte: currentPeriodStart(now) } },
  });
  return resolveBudgetGuard(periodTotal, getGenerationCeiling());
}
