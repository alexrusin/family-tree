import { describe, expect, it } from "vitest";
import {
  consumeGenerationAllowance,
  getAllowanceStatus,
  refundGenerationAllowance,
  reserveGenerationAllowance,
  type AllowanceLedgerPrisma,
} from "./allowance-ledger";
import { MONTHLY_GENERATION_ALLOWANCE } from "./allowance-period";

interface FakeRow {
  userId: string;
  periodKey: string;
  kind: "reservation" | "consumption" | "refund";
  reservationId: string;
  createdAt: Date;
}

function createFakePrisma() {
  const rows: FakeRow[] = [];
  let sequence = 0;

  const prisma: AllowanceLedgerPrisma = {
    generationLedgerEntry: {
      findMany: async ({ where }) => {
        // A microtask delay so concurrent callers interleave their reads,
        // the way real concurrent requests would — this is what would
        // expose a missing lock.
        await new Promise((resolve) => setTimeout(resolve, 0));
        return rows
          .filter((r) => r.userId === where.userId && r.periodKey === where.periodKey)
          .map(({ kind, reservationId }) => ({ kind, reservationId }));
      },
      findFirst: async ({ where }) => {
        const row = rows.find(
          (r) => r.reservationId === where.reservationId && r.kind === where.kind,
        );
        return row ? { userId: row.userId, periodKey: row.periodKey } : null;
      },
      create: async ({ data }) => {
        rows.push({ ...data, createdAt: new Date(sequence++) });
        return data;
      },
    },
  };

  return { prisma, rows };
}

const NOW = new Date("2026-07-04T12:00:00Z");

describe("reserveGenerationAllowance -> consumeGenerationAllowance", () => {
  it("decrements remaining by exactly one on success", async () => {
    const { prisma } = createFakePrisma();

    const outcome = await reserveGenerationAllowance(prisma, "user-1", "res-1", NOW);
    expect(outcome).toEqual({ ok: true, resetAt: new Date("2026-08-01T00:00:00Z") });
    expect((await getAllowanceStatus(prisma, "user-1", NOW)).remaining).toBe(
      MONTHLY_GENERATION_ALLOWANCE - 1,
    );

    await consumeGenerationAllowance(prisma, "res-1");
    expect((await getAllowanceStatus(prisma, "user-1", NOW)).remaining).toBe(
      MONTHLY_GENERATION_ALLOWANCE - 1,
    );
  });
});

describe("reserveGenerationAllowance -> refundGenerationAllowance", () => {
  it("nets back to the original remaining count", async () => {
    const { prisma } = createFakePrisma();

    const before = (await getAllowanceStatus(prisma, "user-1", NOW)).remaining;
    await reserveGenerationAllowance(prisma, "user-1", "res-1", NOW);
    await refundGenerationAllowance(prisma, "res-1");

    expect((await getAllowanceStatus(prisma, "user-1", NOW)).remaining).toBe(before);
  });
});

describe("cap reached", () => {
  it("blocks a reservation once the monthly allowance is exhausted, naming the reset time", async () => {
    const { prisma } = createFakePrisma();

    for (let i = 0; i < MONTHLY_GENERATION_ALLOWANCE; i++) {
      const outcome = await reserveGenerationAllowance(prisma, "user-1", `res-${i}`, NOW);
      expect(outcome.ok).toBe(true);
    }

    const blocked = await reserveGenerationAllowance(prisma, "user-1", "res-over", NOW);
    expect(blocked).toEqual({ ok: false, resetAt: new Date("2026-08-01T00:00:00Z") });
  });

  it("scopes the cap per user", async () => {
    const { prisma } = createFakePrisma();
    for (let i = 0; i < MONTHLY_GENERATION_ALLOWANCE; i++) {
      await reserveGenerationAllowance(prisma, "user-1", `res-${i}`, NOW);
    }

    const outcome = await reserveGenerationAllowance(prisma, "user-2", "res-other", NOW);
    expect(outcome.ok).toBe(true);
  });
});

describe("concurrency safety", () => {
  it("does not let concurrent reservations push a user past the cap", async () => {
    const { prisma, rows } = createFakePrisma();

    const attempts = MONTHLY_GENERATION_ALLOWANCE + 5;
    const outcomes = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        reserveGenerationAllowance(prisma, "user-1", `res-${i}`, NOW),
      ),
    );

    const succeeded = outcomes.filter((o) => o.ok);
    const blocked = outcomes.filter((o) => !o.ok);
    expect(succeeded).toHaveLength(MONTHLY_GENERATION_ALLOWANCE);
    expect(blocked).toHaveLength(attempts - MONTHLY_GENERATION_ALLOWANCE);
    expect(rows.filter((r) => r.kind === "reservation")).toHaveLength(
      MONTHLY_GENERATION_ALLOWANCE,
    );
  });
});

describe("finalizing an unknown reservation", () => {
  it("refuses to consume or refund a reservation that was never reserved", async () => {
    const { prisma } = createFakePrisma();

    await expect(consumeGenerationAllowance(prisma, "res-unknown")).rejects.toThrow(
      "ERR_UNKNOWN_RESERVATION",
    );
    await expect(refundGenerationAllowance(prisma, "res-unknown")).rejects.toThrow(
      "ERR_UNKNOWN_RESERVATION",
    );
  });

  it("refuses to finalize the same reservation twice", async () => {
    const { prisma } = createFakePrisma();
    await reserveGenerationAllowance(prisma, "user-1", "res-1", NOW);
    await consumeGenerationAllowance(prisma, "res-1");

    await expect(consumeGenerationAllowance(prisma, "res-1")).rejects.toThrow(
      "ERR_RESERVATION_ALREADY_FINALIZED",
    );
    await expect(refundGenerationAllowance(prisma, "res-1")).rejects.toThrow(
      "ERR_RESERVATION_ALREADY_FINALIZED",
    );
  });
});
