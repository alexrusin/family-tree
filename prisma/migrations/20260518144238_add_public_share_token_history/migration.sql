-- CreateEnum
CREATE TYPE "PublicShareTokenStatus" AS ENUM ('regenerated');

-- CreateTable
CREATE TABLE "PublicShareTokenHistory" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "PublicShareTokenStatus" NOT NULL DEFAULT 'regenerated',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicShareTokenHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicShareTokenHistory_token_hash_key" ON "PublicShareTokenHistory"("token_hash");

-- CreateIndex
CREATE INDEX "PublicShareTokenHistory_tree_id_status_idx" ON "PublicShareTokenHistory"("tree_id", "status");

-- AddForeignKey
ALTER TABLE "PublicShareTokenHistory" ADD CONSTRAINT "PublicShareTokenHistory_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
