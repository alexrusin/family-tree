-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "FamilyPicture" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "member_snapshot" JSONB NOT NULL,
    "style_preset" TEXT NOT NULL,
    "setting_preset" TEXT,
    "custom_place" TEXT,
    "personal_touch" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "FamilyPicture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyPictureVersion" (
    "id" TEXT NOT NULL,
    "family_picture_id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyPictureVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "family_picture_id" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyPicture_user_id_idx" ON "FamilyPicture"("user_id");

-- CreateIndex
CREATE INDEX "FamilyPicture_tree_id_idx" ON "FamilyPicture"("tree_id");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyPictureVersion_generation_id_key" ON "FamilyPictureVersion"("generation_id");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyPictureVersion_family_picture_id_version_number_key" ON "FamilyPictureVersion"("family_picture_id", "version_number");

-- CreateIndex
CREATE INDEX "Generation_user_id_idx" ON "Generation"("user_id");

-- CreateIndex
CREATE INDEX "Generation_family_picture_id_idx" ON "Generation"("family_picture_id");

-- CreateIndex
CREATE INDEX "Generation_status_created_at_idx" ON "Generation"("status", "created_at");

-- AddForeignKey
ALTER TABLE "FamilyPicture" ADD CONSTRAINT "FamilyPicture_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPictureVersion" ADD CONSTRAINT "FamilyPictureVersion_family_picture_id_fkey" FOREIGN KEY ("family_picture_id") REFERENCES "FamilyPicture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPictureVersion" ADD CONSTRAINT "FamilyPictureVersion_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_family_picture_id_fkey" FOREIGN KEY ("family_picture_id") REFERENCES "FamilyPicture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
