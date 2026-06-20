import { withTreeRole } from "@/lib/with-tree-role";
import type { DatePrecision, MemberGender } from "@/generated/prisma/enums";
import { toPrismaNodePositions } from "@/lib/tree-domain/tree-arrangement-json";
import {
  compareLifeSpan,
  type PartialDate,
} from "@/lib/tree-domain/date-precision";
import {
  createS3Client,
  deletePhotoByKey,
  generatePhotoKey,
  photoPublicUrl,
  processImage,
  uploadProcessedPhoto,
  validatePhotoFile,
} from "@/lib/tree-domain/photo-upload";
import { resolveTreeMemberPhotoUrl } from "@/lib/tree-domain/member-photo";
import {
  isValidArrangement,
  pruneArrangement,
} from "@/lib/tree-domain/tree-layout";

const VALID_GENDERS = new Set<MemberGender>([
  "male",
  "female",
  "other",
  "undisclosed",
]);
const VALID_PRECISIONS = new Set<DatePrecision>(["year", "month", "day"]);

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

export const PATCH = withTreeRole<{ treeId: string; memberId: string }>(
  "editor",
  async (ctx) => {
    const { treeId, memberId } = ctx.params;
    const updateData: {
      firstName?: string;
      lastName?: string | null;
      maidenName?: string | null;
      isLiving?: boolean;
      gender?: MemberGender;
      bio?: string | null;
      birthPrecision?: DatePrecision | null;
      birthYear?: number | null;
      birthMonth?: number | null;
      birthDay?: number | null;
      deathPrecision?: DatePrecision | null;
      deathYear?: number | null;
      deathMonth?: number | null;
      deathDay?: number | null;
      photoKey?: string | null;
      photoUrl?: string | null;
    } = {};
    const contentType = ctx.request.headers.get("content-type") ?? "";
    let photoFile: Blob | null = null;
    let removePhoto = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await ctx.request.formData();
      const firstName = formData.get("firstName");
      if (typeof firstName !== "string" || firstName.trim().length === 0) {
        return Response.json(
          { errorCode: "ERR_FIRST_NAME_REQUIRED" },
          { status: 400 },
        );
      }

      updateData.firstName = firstName.trim();
      updateData.lastName =
        typeof formData.get("lastName") === "string"
          ? ((formData.get("lastName") as string).trim() || null)
          : null;
      updateData.maidenName =
        typeof formData.get("maidenName") === "string"
          ? ((formData.get("maidenName") as string).trim() || null)
          : null;
      updateData.isLiving = formData.get("isLiving") === "true";

      const gender = formData.get("gender");
      if (
        typeof gender === "string" &&
        VALID_GENDERS.has(gender as MemberGender)
      ) {
        updateData.gender = gender as MemberGender;
      }

      const bio = formData.get("bio");
      if (typeof bio === "string") {
        updateData.bio = bio.trim().slice(0, 1000) || null;
      }

      const birthPrecisionRaw = formData.get("birthPrecision");
      const birthPrecision =
        typeof birthPrecisionRaw === "string" &&
        VALID_PRECISIONS.has(birthPrecisionRaw as DatePrecision)
          ? (birthPrecisionRaw as DatePrecision)
          : null;
      const birthYear = toOptionalInt(
        formData.get("birthYear") as string | null,
      );
      const birthMonth = toOptionalInt(
        formData.get("birthMonth") as string | null,
      );
      const birthDay = toOptionalInt(
        formData.get("birthDay") as string | null,
      );
      if (birthYear === null) {
        updateData.birthPrecision = null;
        updateData.birthYear = null;
        updateData.birthMonth = null;
        updateData.birthDay = null;
      } else {
        updateData.birthPrecision = birthPrecision;
        updateData.birthYear = birthYear;
        updateData.birthMonth = birthMonth;
        updateData.birthDay = birthDay;
      }

      const deathPrecisionRaw = formData.get("deathPrecision");
      const deathPrecision =
        typeof deathPrecisionRaw === "string" &&
        VALID_PRECISIONS.has(deathPrecisionRaw as DatePrecision)
          ? (deathPrecisionRaw as DatePrecision)
          : null;
      const deathYear = toOptionalInt(
        formData.get("deathYear") as string | null,
      );
      const deathMonth = toOptionalInt(
        formData.get("deathMonth") as string | null,
      );
      const deathDay = toOptionalInt(
        formData.get("deathDay") as string | null,
      );
      if (updateData.isLiving || deathYear === null) {
        updateData.deathPrecision = null;
        updateData.deathYear = null;
        updateData.deathMonth = null;
        updateData.deathDay = null;
      } else {
        updateData.deathPrecision = deathPrecision;
        updateData.deathYear = deathYear;
        updateData.deathMonth = deathMonth;
        updateData.deathDay = deathDay;
      }

      const candidate = formData.get("photo");
      if (candidate instanceof Blob && candidate.size > 0) {
        photoFile = candidate;
      }

      if (!photoFile && formData.get("removePhoto") === "true") {
        removePhoto = true;
      }
    } else {
      const body = await ctx.request.json();

      if (
        body?.firstName !== undefined &&
        (typeof body.firstName !== "string" ||
          body.firstName.trim().length === 0)
      ) {
        return Response.json(
          { errorCode: "ERR_FIRST_NAME_REQUIRED" },
          { status: 400 },
        );
      }

      if (typeof body?.firstName === "string") {
        updateData.firstName = body.firstName.trim();
      }

      if (body?.lastName !== undefined) {
        if (body.lastName === null) {
          updateData.lastName = null;
        } else if (typeof body.lastName === "string") {
          updateData.lastName = body.lastName.trim() || null;
        }
      }

      if (body?.maidenName !== undefined) {
        if (body.maidenName === null) {
          updateData.maidenName = null;
        } else if (typeof body.maidenName === "string") {
          updateData.maidenName = body.maidenName.trim() || null;
        }
      }

      if (
        body?.isLiving !== undefined &&
        typeof body.isLiving === "boolean"
      ) {
        updateData.isLiving = body.isLiving;
      }

      if (
        typeof body?.gender === "string" &&
        VALID_GENDERS.has(body.gender)
      ) {
        updateData.gender = body.gender as MemberGender;
      }

      if (body?.bio !== undefined) {
        updateData.bio =
          typeof body.bio === "string"
            ? body.bio.trim().slice(0, 1000) || null
            : null;
      }

      if (body?.birthPrecision !== undefined) {
        updateData.birthPrecision =
          typeof body.birthPrecision === "string" &&
          VALID_PRECISIONS.has(body.birthPrecision)
            ? (body.birthPrecision as DatePrecision)
            : null;
      }
      if (body?.birthYear !== undefined) {
        updateData.birthYear =
          typeof body.birthYear === "number" ? body.birthYear : null;
      }
      if (body?.birthMonth !== undefined) {
        updateData.birthMonth =
          typeof body.birthMonth === "number" ? body.birthMonth : null;
      }
      if (body?.birthDay !== undefined) {
        updateData.birthDay =
          typeof body.birthDay === "number" ? body.birthDay : null;
      }

      if (body?.deathPrecision !== undefined) {
        updateData.deathPrecision =
          typeof body.deathPrecision === "string" &&
          VALID_PRECISIONS.has(body.deathPrecision)
            ? (body.deathPrecision as DatePrecision)
            : null;
      }
      if (body?.deathYear !== undefined) {
        updateData.deathYear =
          typeof body.deathYear === "number" ? body.deathYear : null;
      }
      if (body?.deathMonth !== undefined) {
        updateData.deathMonth =
          typeof body.deathMonth === "number" ? body.deathMonth : null;
      }
      if (body?.deathDay !== undefined) {
        updateData.deathDay =
          typeof body.deathDay === "number" ? body.deathDay : null;
      }
    }

    if (Object.keys(updateData).length === 0 && !photoFile && !removePhoto) {
      return Response.json(
        { errorCode: "ERR_INVALID_MEMBER_UPDATE" },
        { status: 400 },
      );
    }

    if (
      typeof updateData.birthYear === "number" &&
      typeof updateData.deathYear === "number"
    ) {
      const birth: PartialDate = {
        precision: (updateData.birthPrecision ??
          "year") as PartialDate["precision"],
        year: updateData.birthYear,
        month: updateData.birthMonth ?? null,
        day: updateData.birthDay ?? null,
      };
      const death: PartialDate = {
        precision: (updateData.deathPrecision ??
          "year") as PartialDate["precision"],
        year: updateData.deathYear,
        month: updateData.deathMonth ?? null,
        day: updateData.deathDay ?? null,
      };
      const chronologyError = compareLifeSpan(birth, death);
      if (chronologyError) {
        return Response.json(
          { errorCode: chronologyError },
          { status: 400 },
        );
      }
    }

    const existingMember = await ctx.prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: {
        id: true,
        treeId: true,
        photoKey: true,
        photoUrl: true,
      },
    });

    if (!existingMember) {
      return Response.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    let uploadedPhotoKey: string | null = null;
    if (photoFile) {
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

      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const processed = await processImage(buffer);
      const key = generatePhotoKey(treeId, crypto.randomUUID());
      await uploadProcessedPhoto({
        s3Client: createS3Client(),
        bucket: process.env.S3_BUCKET ?? "",
        key,
        buffer: processed,
      });
      uploadedPhotoKey = key;
      updateData.photoKey = key;
      updateData.photoUrl = photoPublicUrl(key);
    }

    if (removePhoto && !photoFile && existingMember.photoKey) {
      updateData.photoKey = null;
      updateData.photoUrl = null;
    }

    let member;
    try {
      member = await ctx.prisma.treeMember.update({
        where: { id: memberId },
        data: updateData,
      });
    } catch (error) {
      if (uploadedPhotoKey) {
        try {
          await deletePhotoByKey({
            s3Client: createS3Client(),
            bucket: process.env.S3_BUCKET ?? "",
            key: uploadedPhotoKey,
          });
        } catch (cleanupError) {
          console.error(
            "Error cleaning up uploaded member photo:",
            cleanupError,
          );
        }
      }
      throw error;
    }

    if (existingMember.photoKey && (uploadedPhotoKey || removePhoto)) {
      try {
        await deletePhotoByKey({
          s3Client: createS3Client(),
          bucket: process.env.S3_BUCKET ?? "",
          key: existingMember.photoKey,
        });
      } catch (cleanupError) {
        console.error("Error deleting previous member photo:", cleanupError);
      }
    }

    return Response.json(
      { member: toResponseMember(member) },
      { status: 200 },
    );
  },
);

export const DELETE = withTreeRole<{ treeId: string; memberId: string }>(
  "owner",
  async (ctx) => {
    const { treeId, memberId } = ctx.params;

    const existingMember = await ctx.prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: { id: true },
    });

    if (!existingMember) {
      return Response.json(
        { errorCode: "ERR_MEMBER_NOT_FOUND" },
        { status: 404 },
      );
    }

    await ctx.prisma.$transaction(async (tx) => {
      await tx.treeMember.delete({
        where: { id: memberId },
      });

      await tx.familyTree.update({
        where: { id: treeId },
        data: { memberCount: { decrement: 1 } },
      });

      const tree = await tx.familyTree.findUnique({
        where: { id: treeId },
        select: { nodePositions: true },
      });
      const raw = tree?.nodePositions;
      if (raw != null && isValidArrangement(raw) && memberId in raw) {
        const remaining = new Set(
          Object.keys(raw).filter((k) => k !== memberId),
        );
        await tx.familyTree.update({
          where: { id: treeId },
          data: {
            nodePositions: toPrismaNodePositions(
              pruneArrangement(raw, remaining),
            ),
          },
        });
      }
    });

    return Response.json({ success: true }, { status: 200 });
  },
);
