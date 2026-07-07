export type BudgetGuardStatus = "open" | "closed";

/**
 * Decides the global budget kill-switch state for the current period: open
 * while spend-or-count is below the ceiling, closed once it reaches the
 * ceiling. Boundary (total == ceiling) is closed so the last unit of budget
 * is never exceeded.
 */
export function resolveBudgetGuard(
  periodSpendOrCount: number,
  ceiling: number,
): BudgetGuardStatus {
  return periodSpendOrCount >= ceiling ? "closed" : "open";
}
