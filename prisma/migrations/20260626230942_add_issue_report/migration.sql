-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "IssueReport" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "page_url" TEXT NOT NULL,
    "tree_id" TEXT,
    "user_agent" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "app_version" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IssueReport_status_created_at_idx" ON "IssueReport"("status", "created_at");

-- AddForeignKey
ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
