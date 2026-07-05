export interface UserDeletionPrisma {
  familyPictureVersion: {
    findMany: (args: {
      where: { familyPicture: { userId: string } };
      select: { s3Key: true };
    }) => Promise<{ s3Key: string }[]>;
  };
}

/**
 * Removes every S3 image belonging to userId's Family Pictures. Must run
 * before the User row is deleted (Postgres cascades FamilyPicture/Version
 * rows on that delete, which would otherwise take the s3Key list with them
 * before the images themselves could be cleaned up) — see the
 * `beforeDelete` wiring in `auth.ts`. Per-key failures are logged and
 * skipped rather than thrown, consistent with the best-effort photo cleanup
 * elsewhere (`tree-domain/photo-upload.ts` callers), so one bad S3 call
 * can't block account deletion.
 */
export async function deleteFamilyPictureImagesForUser(
  deps: {
    prisma: UserDeletionPrisma;
    deletePhoto: (key: string) => Promise<void>;
  },
  userId: string,
): Promise<void> {
  const versions = await deps.prisma.familyPictureVersion.findMany({
    where: { familyPicture: { userId } },
    select: { s3Key: true },
  });

  await Promise.all(
    versions.map(async ({ s3Key }) => {
      try {
        await deps.deletePhoto(s3Key);
      } catch (error) {
        console.error(
          "Failed to delete Family Picture image for deleted user",
          error,
        );
      }
    }),
  );
}
