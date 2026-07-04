import { describe, expect, it, vi } from "vitest";
import {
  isStrandedGeneration,
  sweepStrandedGenerations,
  STRANDED_GENERATION_THRESHOLD_MINUTES,
} from "./stranded-sweep";

describe("isStrandedGeneration", () => {
  const now = new Date("2026-07-04T12:00:00Z");

  it("is not stranded just under the threshold", () => {
    const createdAt = new Date(now.getTime() - (STRANDED_GENERATION_THRESHOLD_MINUTES * 60 * 1000 - 1));
    expect(isStrandedGeneration(createdAt, now)).toBe(false);
  });

  it("is stranded at the threshold boundary", () => {
    const createdAt = new Date(now.getTime() - STRANDED_GENERATION_THRESHOLD_MINUTES * 60 * 1000);
    expect(isStrandedGeneration(createdAt, now)).toBe(true);
  });

  it("is stranded well past the threshold", () => {
    const createdAt = new Date(now.getTime() - 60 * 60 * 1000);
    expect(isStrandedGeneration(createdAt, now)).toBe(true);
  });
});

describe("sweepStrandedGenerations", () => {
  it("fails pending Generations older than the cutoff", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const now = new Date("2026-07-04T12:00:00Z");

    const count = await sweepStrandedGenerations({ generation: { updateMany } }, now, 15);

    expect(count).toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: "pending",
        createdAt: { lt: new Date("2026-07-04T11:45:00Z") },
      },
      data: { status: "failed", errorMessage: "ERR_GENERATION_STRANDED" },
    });
  });
});
