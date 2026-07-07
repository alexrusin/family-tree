-- CreateEnum
CREATE TYPE "GenerationLedgerEntryKind" AS ENUM ('reservation', 'consumption', 'refund');

-- CreateTable
CREATE TABLE "GenerationLedgerEntry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "GenerationLedgerEntryKind" NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationLedgerEntry_user_id_period_key_idx" ON "GenerationLedgerEntry"("user_id", "period_key");

-- CreateIndex
CREATE INDEX "GenerationLedgerEntry_reservation_id_idx" ON "GenerationLedgerEntry"("reservation_id");

-- AddForeignKey
ALTER TABLE "GenerationLedgerEntry" ADD CONSTRAINT "GenerationLedgerEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
