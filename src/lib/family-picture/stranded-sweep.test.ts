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
  const now = new Date("2026-07-04T12:00:00Z");

  it("finds stranded pending Generations older than the cutoff", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const refund = vi.fn();

    await sweepStrandedGenerations({ generation: { findMany, updateMany } }, refund, now, 15);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: "pending",
        createdAt: { lt: new Date("2026-07-04T11:45:00Z") },
      },
      select: { id: true },
    });
  });

  it("fails each stranded Generation and refunds its allowance slot", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "gen-1" }, { id: "gen-2" }]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const refund = vi.fn().mockResolvedValue(undefined);

    const count = await sweepStrandedGenerations({ generation: { findMany, updateMany } }, refund, now, 15);

    expect(count).toBe(2);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "gen-1", status: "pending" },
      data: { status: "failed", errorMessage: "ERR_GENERATION_STRANDED" },
    });
    expect(refund).toHaveBeenCalledWith("gen-1");
    expect(refund).toHaveBeenCalledWith("gen-2");
  });

  it("does not refund a Generation another path already transitioned out of pending", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "gen-1" }]);
    // count 0 => the conditional pending->failed update matched nothing, so a
    // racing completion (or parallel sweep) already settled this reservation.
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const refund = vi.fn();

    const count = await sweepStrandedGenerations({ generation: { findMany, updateMany } }, refund, now, 15);

    expect(count).toBe(0);
    expect(refund).not.toHaveBeenCalled();
  });

  it("keeps sweeping when a refund throws (already-finalized race)", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "gen-1" }, { id: "gen-2" }]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const refund = vi
      .fn()
      .mockRejectedValueOnce(new Error("ERR_RESERVATION_ALREADY_FINALIZED"))
      .mockResolvedValueOnce(undefined);

    const count = await sweepStrandedGenerations({ generation: { findMany, updateMany } }, refund, now, 15);

    expect(count).toBe(2);
    expect(refund).toHaveBeenCalledTimes(2);
  });
});
