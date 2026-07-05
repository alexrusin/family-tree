import { describe, expect, it } from "vitest";
import { currentPeriodKey, currentPeriodStart, nextPeriodResetAt } from "./allowance-period";

describe("currentPeriodKey", () => {
  it("formats a UTC year-month key", () => {
    expect(currentPeriodKey(new Date("2026-07-04T12:00:00Z"))).toBe("2026-07");
  });

  it("pads single-digit months", () => {
    expect(currentPeriodKey(new Date("2026-01-15T00:00:00Z"))).toBe("2026-01");
  });
});

describe("nextPeriodResetAt", () => {
  it("returns the first moment of the next UTC month", () => {
    expect(nextPeriodResetAt(new Date("2026-07-04T12:00:00Z"))).toEqual(
      new Date("2026-08-01T00:00:00Z"),
    );
  });

  it("rolls over into the next year at the December boundary", () => {
    expect(nextPeriodResetAt(new Date("2026-12-31T23:59:59Z"))).toEqual(
      new Date("2027-01-01T00:00:00Z"),
    );
  });
});

describe("currentPeriodStart", () => {
  it("returns the first moment of the current UTC month", () => {
    expect(currentPeriodStart(new Date("2026-07-04T12:00:00Z"))).toEqual(
      new Date("2026-07-01T00:00:00Z"),
    );
  });
});
