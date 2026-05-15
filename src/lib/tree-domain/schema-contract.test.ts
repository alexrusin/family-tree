import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("schema contract", () => {
  it("has TreeMember table", async () => {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'TreeMember'
      )
    `;
    expect(result[0]?.exists).toBe(true);
  });

  it("has Relationship table", async () => {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'Relationship'
      )
    `;
    expect(result[0]?.exists).toBe(true);
  });

  it("has Invitation table", async () => {
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'Invitation'
      )
    `;
    expect(result[0]?.exists).toBe(true);
  });
});
