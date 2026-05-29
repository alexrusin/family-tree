-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('parent', 'spouse', 'sibling');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('year', 'month', 'day');

-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('male', 'female', 'other', 'undisclosed');

-- CreateTable
CREATE TABLE "TreeMember" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "gender" "MemberGender" NOT NULL DEFAULT 'undisclosed',
    "is_living" BOOLEAN NOT NULL DEFAULT false,
    "bio" VARCHAR(1000),
    "photo_url" TEXT,
    "photo_key" TEXT,
    "birth_precision" "DatePrecision",
    "birth_year" INTEGER,
    "birth_month" INTEGER,
    "birth_day" INTEGER,
    "death_precision" "DatePrecision",
    "death_year" INTEGER,
    "death_month" INTEGER,
    "death_day" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "TreeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "from_member_id" TEXT NOT NULL,
    "to_member_id" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreeMember_tree_id_idx" ON "TreeMember"("tree_id");

-- CreateIndex
CREATE INDEX "Relationship_tree_id_idx" ON "Relationship"("tree_id");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_tree_id_from_member_id_to_member_id_type_key" ON "Relationship"("tree_id", "from_member_id", "to_member_id", "type");

-- AddForeignKey
ALTER TABLE "TreeMember" ADD CONSTRAINT "TreeMember_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "FamilyTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "TreeMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "TreeMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
