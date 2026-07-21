export interface FamilyPictureDeletionPrisma {
  familyPicture: {
    findFirst: (args: {
      where: { id: string; treeId: string };
      select: {
        userId: true;
        versions: { select: { s3Key: true } };
        generations: {
          orderBy: { createdAt: "desc" };
          take: 1;
          select: { status: true };
        };
      };
    }) => Promise<{
      userId: string;
      versions: { s3Key: string }[];
      generations: { status: string }[];
    } | null>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
}

export type DeleteFamilyPictureOutcome =
  | { ok: true }
  | { ok: false; errorCode: "ERR_NOT_FOUND" | "ERR_GENERATION_IN_PROGRESS" };

/**
 * Deletes one Family Picture on its owner's behalf: every Version's S3 image
 * first, then the row (whose cascade takes the Version and Generation rows).
 *
 * Authorization is **ownership alone** — deliberately not the caller's role on
 * the source tree. A Family Picture is a private, user-owned artifact that
 * "survives deletion of the source Family Tree" (PRD, issue 13), so gating its
 * removal on a tree role would strand a picture as permanently undeletable once
 * the tree is gone or the owner is dropped as a Collaborator. Generating still
 * requires a tree role, because that reads the tree's Members; disposing of an
 * already-generated picture does not.
 *
 * Images are deleted before the row because the cascade takes the `s3Key` list
 * with it — this is the last moment those keys are known. Per-key failures are
 * logged and skipped rather than thrown, matching the best-effort cleanup in
 * `user-deletion.ts`, so one bad S3 call can't leave an undeletable row behind.
 *
 * Deleting never refunds Generation Allowance: those model calls were billed.
 */
export async function deleteFamilyPicture(
  deps: {
    prisma: FamilyPictureDeletionPrisma;
    deletePhoto: (key: string) => Promise<void>;
  },
  target: { familyPictureId: string; treeId: string; userId: string },
): Promise<DeleteFamilyPictureOutcome> {
  const picture = await deps.prisma.familyPicture.findFirst({
    where: { id: target.familyPictureId, treeId: target.treeId },
    select: {
      userId: true,
      versions: { select: { s3Key: true } },
      generations: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
  });

  // A picture belonging to someone else is reported as missing, not forbidden:
  // its very existence is private to its owner.
  if (!picture || picture.userId !== target.userId) {
    return { ok: false, errorCode: "ERR_NOT_FOUND" };
  }

  // A pending Generation still has an in-flight job that will write a Version
  // row against this picture; deleting now would orphan that write.
  if (picture.generations[0]?.status === "pending") {
    return { ok: false, errorCode: "ERR_GENERATION_IN_PROGRESS" };
  }

  await Promise.all(
    picture.versions.map(async ({ s3Key }) => {
      try {
        await deps.deletePhoto(s3Key);
      } catch (error) {
        console.error("Failed to delete Family Picture image", error);
      }
    }),
  );

  await deps.prisma.familyPicture.delete({ where: { id: target.familyPictureId } });

  return { ok: true };
}
