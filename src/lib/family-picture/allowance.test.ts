import { describe, expect, it } from "vitest";
import {
  balance,
  canReserve,
  consume,
  refund,
  reserve,
  type LedgerEntry,
} from "./allowance";

function grant(amount: number): LedgerEntry {
  return { kind: "grant", amount };
}

describe("balance", () => {
  it("sums grants", () => {
    expect(balance([grant(5), grant(3)])).toBe(8);
  });

  it("nets a reservation against a grant", () => {
    const entries = reserve([grant(5)], "res-1");
    expect(balance(entries)).toBe(4);
  });

  it("nets grants, reservations, consumptions, and refunds together", () => {
    let entries: LedgerEntry[] = [grant(3)];
    entries = reserve(entries, "res-1");
    entries = consume(entries, "res-1");
    entries = reserve(entries, "res-2");
    entries = refund(entries, "res-2");
    entries = reserve(entries, "res-3");

    // grant 3, consumed res-1 (-1), refunded res-2 (net 0), open reservation res-3 (-1)
    expect(balance(entries)).toBe(1);
  });

  it("is zero for an empty ledger", () => {
    expect(balance([])).toBe(0);
  });
});

describe("canReserve", () => {
  it("is false when balance is zero", () => {
    expect(canReserve([])).toBe(false);
    expect(canReserve([grant(0)])).toBe(false);
  });

  it("is true when balance is positive", () => {
    expect(canReserve([grant(1)])).toBe(true);
  });

  it("is false exactly at the cap boundary after the last unit is reserved", () => {
    const entries = reserve([grant(1)], "res-1");
    expect(balance(entries)).toBe(0);
    expect(canReserve(entries)).toBe(false);
  });
});

describe("reserve -> consume", () => {
  it("decrements the balance by exactly one", () => {
    const before = [grant(5)];
    const afterReserve = reserve(before, "res-1");
    expect(balance(afterReserve)).toBe(4);

    const afterConsume = consume(afterReserve, "res-1");
    expect(balance(afterConsume)).toBe(4);
  });
});

describe("reserve -> refund", () => {
  it("leaves the balance unchanged (net zero)", () => {
    const before = [grant(5)];
    const afterReserve = reserve(before, "res-1");
    const afterRefund = refund(afterReserve, "res-1");
    expect(balance(afterRefund)).toBe(balance(before));
  });
});

describe("concurrency safety", () => {
  it("does not let two reservations push the balance below zero", () => {
    const entries = reserve([grant(1)], "res-1");
    expect(canReserve(entries)).toBe(false);
    expect(() => reserve(entries, "res-2")).toThrow("ERR_ALLOWANCE_EXHAUSTED");
  });

  it("refuses to consume or refund a reservation that was never made", () => {
    expect(() => consume([grant(1)], "res-unknown")).toThrow(
      "ERR_UNKNOWN_RESERVATION",
    );
    expect(() => refund([grant(1)], "res-unknown")).toThrow(
      "ERR_UNKNOWN_RESERVATION",
    );
  });

  it("refuses to finalize the same reservation twice", () => {
    const entries = reserve([grant(1)], "res-1");
    const consumed = consume(entries, "res-1");

    expect(() => consume(consumed, "res-1")).toThrow(
      "ERR_RESERVATION_ALREADY_FINALIZED",
    );
    expect(() => refund(consumed, "res-1")).toThrow(
      "ERR_RESERVATION_ALREADY_FINALIZED",
    );
  });
});
