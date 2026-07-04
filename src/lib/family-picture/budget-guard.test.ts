import { describe, expect, it } from "vitest";
import { resolveBudgetGuard } from "./budget-guard";

describe("resolveBudgetGuard", () => {
  it("is open when the period total is below the ceiling", () => {
    expect(resolveBudgetGuard(0, 100)).toBe("open");
    expect(resolveBudgetGuard(99, 100)).toBe("open");
  });

  it("is closed when the period total is at the ceiling", () => {
    expect(resolveBudgetGuard(100, 100)).toBe("closed");
  });

  it("is closed when the period total is above the ceiling", () => {
    expect(resolveBudgetGuard(101, 100)).toBe("closed");
  });
});
