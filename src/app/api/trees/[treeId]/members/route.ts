import { withTreeRole } from "@/lib/with-tree-role";
import {
  type TreeRoleClient,
  getTreeRole,
} from "@/lib/tree-domain/tree-access";
import {
  createMember,
  type MemberGenderValue,
  type MemberDatePrecision,
} from "@/lib/tree-domain/member-service";
import {
  validatePhotoFile,
  processImage,
  uploadProcessedPhoto,
  createS3Client,
  generatePhotoKey,
  photoPublicUrl,
} from "@/lib/tree-domain/photo-upload";
import { resolveTreeMemberPhotoUrl } from "@/lib/tree-domain/member-photo";

const VALID_GENDERS = new Set<MemberGenderValue>([
  "male",
  "female",
  "other",
  "undisclosed",
]);
const VALID_PRECISIONS = new Set<MemberDatePrecision>(["year", "month", "day"]);

function toOptionalInt(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function toResponseMember<
  T extends {
    id: string;
    treeId: string;
    photoKey: string | null;
    photoUrl: string | null;
  },
>(member: T): T {
  return {
    ...member,
    photoUrl: resolveTreeMemberPhotoUrl({
      treeId: member.treeId,
      memberId: member.id,
      photoKey: member.photoKey,
      storedPhotoUrl: member.photoUrl,
    }),
  };
}

export const GET = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  const members = await ctx.prisma.treeMember.findMany({
    where: { treeId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(
    { members: members.map((member) => toResponseMember(member)) },
    { status: 200 },
  );
});

export const POST = withTreeRole("editor", async (ctx) => {
  const { treeId } = ctx.params;
  const formData = await ctx.request.formData();

  const firstName = (formData.get("firstName") as string | null) ?? "";
  const lastName = formData.get("lastName") as string | null;
  const maidenName = formData.get("maidenName") as string | null;
  const isLiving = formData.get("isLiving") === "true";
  const genderRaw = formData.get("gender") as string | null;
  const gender =
    genderRaw && VALID_GENDERS.has(genderRaw as MemberGenderValue)
      ? (genderRaw as MemberGenderValue)
      : "undisclosed";
  const bio = formData.get("bio") as string | null;
  const birthPrecisionRaw = formData.get("birthPrecision") as string | null;
  const birthPrecision =
    birthPrecisionRaw &&
    VALID_PRECISIONS.has(birthPrecisionRaw as MemberDatePrecision)
      ? (birthPrecisionRaw as MemberDatePrecision)
      : null;
  const birthYear = toOptionalInt(formData.get("birthYear") as string | null);
  const birthMonth = toOptionalInt(
    formData.get("birthMonth") as string | null,
  );
  const birthDay = toOptionalInt(formData.get("birthDay") as string | null);
  const deathPrecisionRaw = formData.get("deathPrecision") as string | null;
  const deathPrecision =
    deathPrecisionRaw &&
    VALID_PRECISIONS.has(deathPrecisionRaw as MemberDatePrecision)
      ? (deathPrecisionRaw as MemberDatePrecision)
      : null;
  const deathYear = toOptionalInt(formData.get("deathYear") as string | null);
  const deathMonth = toOptionalInt(
    formData.get("deathMonth") as string | null,
  );
  const deathDay = toOptionalInt(formData.get("deathDay") as string | null);

  let photoKey: string | null = null;
  let photoUrl: string | null = null;
  const photoFile = formData.get("photo");
  if (photoFile instanceof Blob && photoFile.size > 0) {
    try {
      validatePhotoFile({
        contentType: photoFile.type,
        sizeBytes: photoFile.size,
      });
    } catch (photoError) {
      const code =
        photoError instanceof Error
          ? photoError.message
          : "ERR_UNSUPPORTED_IMAGE_TYPE";
      return Response.json({ errorCode: code }, { status: 400 });
    }
    try {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const processed = await processImage(buffer);
      const key = generatePhotoKey(treeId, crypto.randomUUID());
      await uploadProcessedPhoto({
        s3Client: createS3Client(),
        bucket: process.env.S3_BUCKET ?? "",
        key,
        buffer: processed,
      });
      photoKey = key;
      photoUrl = photoPublicUrl(key);
    } catch (processingError) {
      console.error("Failed to process member photo upload", processingError);
      return Response.json(
        { errorCode: "ERR_PHOTO_PROCESSING_FAILED" },
        { status: 400 },
      );
    }
  }

  const member = await ctx.prisma.$transaction(async (tx) => {
    const created = await createMember({
      repo: {
        getRole: (tId, uId) =>
          getTreeRole(tx as unknown as TreeRoleClient, tId, uId),
        getTreeMemberCount: async (tId) => {
          const tree = await tx.familyTree.findUnique({
            where: { id: tId },
            select: { memberCount: true },
          });
          return tree?.memberCount ?? 0;
        },
        createMemberRecord: (args) => tx.treeMember.create({ data: args }),
      },
      actorUserId: ctx.user.id,
      treeId,
      input: {
        firstName,
        isLiving,
        lastName: lastName?.trim() || null,
        maidenName: maidenName?.trim() || null,
        gender,
        bio: bio?.trim().slice(0, 1000) || null,
        birthPrecision,
        birthYear,
        birthMonth,
        birthDay,
        deathPrecision,
        deathYear,
        deathMonth,
        deathDay,
        photoKey,
        photoUrl,
      },
    });

    await tx.familyTree.update({
      where: { id: treeId },
      data: { memberCount: { increment: 1 } },
    });

    return created;
  });

  return Response.json(
    { member: toResponseMember(member) },
    { status: 201 },
  );
});
