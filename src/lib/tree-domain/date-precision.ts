export type DatePrecision = "year" | "month" | "day";

export interface PartialDateInput {
  precision: DatePrecision;
  year: number;
  month?: number;
  day?: number;
}

export interface PartialDate {
  precision: DatePrecision;
  year: number;
  month: number | null;
  day: number | null;
}

export function parsePartialDate(input: PartialDateInput): PartialDate {
  if (input.precision === "year") {
    return { precision: "year", year: input.year, month: null, day: null };
  }

  if (input.precision === "month") {
    if (!input.month || input.month < 1 || input.month > 12) {
      throw new Error("ERR_INVALID_PARTIAL_DATE");
    }
    return {
      precision: "month",
      year: input.year,
      month: input.month,
      day: null,
    };
  }

  if (
    !input.month ||
    input.month < 1 ||
    input.month > 12 ||
    !input.day ||
    input.day < 1 ||
    input.day > 31
  ) {
    throw new Error("ERR_INVALID_PARTIAL_DATE");
  }

  return {
    precision: "day",
    year: input.year,
    month: input.month,
    day: input.day,
  };
}

export function compareLifeSpan(
  birth: PartialDate | null,
  death: PartialDate | null,
): string | null {
  if (!birth || !death) return null;
  if (death.year < birth.year) return "ERR_DEATH_BEFORE_BIRTH";
  if (death.year > birth.year) return null;

  if (birth.month && death.month && death.month < birth.month) {
    return "ERR_DEATH_BEFORE_BIRTH";
  }

  if (
    birth.month &&
    death.month &&
    birth.day &&
    death.day &&
    death.month === birth.month &&
    death.day < birth.day
  ) {
    return "ERR_DEATH_BEFORE_BIRTH";
  }

  return null;
}
