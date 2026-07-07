-- AlterTable
ALTER TABLE "FamilyPicture" ADD COLUMN     "current_version_number" INTEGER;

-- Backfill existing rows to point at their latest Version, so a picture
-- created before this migration still shows the same image it did before.
UPDATE "FamilyPicture" fp
SET "current_version_number" = latest.max_version_number
FROM (
    SELECT "family_picture_id", MAX("version_number") AS max_version_number
    FROM "FamilyPictureVersion"
    GROUP BY "family_picture_id"
) latest
WHERE latest."family_picture_id" = fp.id;
