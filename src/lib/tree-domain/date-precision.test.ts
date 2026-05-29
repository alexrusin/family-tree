import { describe, it, expect } from "vitest";
import { parsePartialDate, compareLifeSpan } from "./date-precision";

describe("parsePartialDate", () => {
  it("parses year precision", () => {
    const parsed = parsePartialDate({ precision: "year", year: 1984 });
    expect(parsed).toEqual({
      precision: "year",
      year: 1984,
      month: null,
      day: null,
    });
  });

  it("parses month-year precision", () => {
    const parsed = parsePartialDate({
      precision: "month",
      year: 1984,
      month: 7,
    });
    expect(parsed).toEqual({
      precision: "month",
      year: 1984,
      month: 7,
      day: null,
    });
  });

  it("throws when month precision has no month", () => {
    expect(() => parsePartialDate({ precision: "month", year: 1984 })).toThrow(
      "ERR_INVALID_PARTIAL_DATE",
    );
  });
});

describe("compareLifeSpan", () => {
  it("rejects impossible chronology", () => {
    const result = compareLifeSpan(
      { precision: "year", year: 1990, month: null, day: null },
      { precision: "year", year: 1980, month: null, day: null },
    );
    expect(result).toBe("ERR_DEATH_BEFORE_BIRTH");
  });
});
