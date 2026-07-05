import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getGenerationCeiling, getGlobalBudgetStatus, type GlobalBudgetPrisma } from "./global-budget";

const NOW = new Date("2026-07-04T12:00:00Z");
const ORIGINAL_ENV = { ...process.env };

function createFakePrisma(rowsCreatedAt: Date[]) {
  const prisma: GlobalBudgetPrisma = {
    generation: {
      count: async ({ where }) =>
        rowsCreatedAt.filter((createdAt) => createdAt >= where.createdAt.gte).length,
    },
  };
  return prisma;
}

describe("getGenerationCeiling", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults when unset", () => {
    delete process.env.FAMILY_PICTURE_GENERATION_CEILING;
    expect(getGenerationCeiling()).toBeGreaterThan(0);
  });

  it("is configurable by the operator via env var", () => {
    process.env.FAMILY_PICTURE_GENERATION_CEILING = "50";
    expect(getGenerationCeiling()).toBe(50);
  });

  it("falls back to the default for invalid values", () => {
    process.env.FAMILY_PICTURE_GENERATION_CEILING = "not-a-number";
    expect(getGenerationCeiling()).toBe(getGenerationCeiling());
    expect(getGenerationCeiling()).toBeGreaterThan(0);
  });
});

describe("getGlobalBudgetStatus", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, FAMILY_PICTURE_GENERATION_CEILING: "3" };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("is open when the period total (across all users) is below the ceiling", async () => {
    const prisma = createFakePrisma([NOW, NOW]);
    expect(await getGlobalBudgetStatus(prisma, NOW)).toBe("open");
  });

  it("is closed once the period total reaches the ceiling", async () => {
    const prisma = createFakePrisma([NOW, NOW, NOW]);
    expect(await getGlobalBudgetStatus(prisma, NOW)).toBe("closed");
  });

  it("only counts Generations from the current period", async () => {
    const lastMonth = new Date("2026-06-15T00:00:00Z");
    const prisma = createFakePrisma([lastMonth, lastMonth, lastMonth, NOW]);
    expect(await getGlobalBudgetStatus(prisma, NOW)).toBe("open");
  });
});
