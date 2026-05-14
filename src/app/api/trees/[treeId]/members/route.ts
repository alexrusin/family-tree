import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
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

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { treeId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role === "none") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const members = await prisma.treeMember.findMany({
      where: { treeId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error listing tree members:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { treeId } = await params;
    const formData = await request.formData();

    const firstName = (formData.get("firstName") as string | null) ?? "";
    const lastName = formData.get("lastName") as string | null;
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
        return NextResponse.json({ errorCode: code }, { status: 400 });
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
      photoKey = key;
      photoUrl = photoPublicUrl(key);
    }

    const prisma = getPrismaClient();

    const member = await prisma.$transaction(async (tx) => {
      const created = await createMember({
        repo: {
          getRole: (tId, uId) =>
            getTreeRole(tx as unknown as TreeRoleClient, tId, uId),
          createMemberRecord: (args) => tx.treeMember.create({ data: args }),
        },
        actorUserId: session.user.id,
        treeId,
        input: {
          firstName,
          isLiving,
          lastName: lastName?.trim() || null,
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

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_FIRST_NAME_REQUIRED") {
        return NextResponse.json(
          { errorCode: "ERR_FIRST_NAME_REQUIRED" },
          { status: 400 },
        );
      }
      if (error.message === "ERR_DEATH_BEFORE_BIRTH") {
        return NextResponse.json(
          { errorCode: "ERR_DEATH_BEFORE_BIRTH" },
          { status: 400 },
        );
      }
    }
    console.error("Error creating tree member:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
