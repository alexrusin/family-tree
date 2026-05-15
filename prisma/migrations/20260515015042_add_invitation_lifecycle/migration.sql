-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'cancelled');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "invited_email" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "message" VARCHAR(500),
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(6) NOT NULL,
    "accepted_at" TIMESTAMP(6),
    "cancelled_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_hash_key" ON "Invitation"("token_hash");

-- CreateIndex
CREATE INDEX "Invitation_tree_id_status_idx" ON "Invitation"("tree_id", "status");

-- CreateIndex
CREATE INDEX "Invitation_invited_email_status_idx" ON "Invitation"("invited_email", "status");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
