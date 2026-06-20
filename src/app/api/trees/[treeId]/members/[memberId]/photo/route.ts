import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { createS3Client, downloadPhotoByKey } from "@/lib/tree-domain/photo-upload";

function isPhotoNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { Code?: string; name?: string };
  return maybeError.Code === "NoSuchKey" || maybeError.name === "NoSuchKey";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; memberId: string }> },
) {
  try {
    const { treeId, memberId } = await params;
    const session = await auth.api.getSession({ headers: request.headers });

    if (session?.user) {
      const role = await getTreeRole(prisma, treeId, session.user.id);
      if (role === "none") {
        return Response.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
      }
    } else {
      const tree = await prisma.familyTree.findUnique({
        where: { id: treeId },
        select: { shareEnabled: true },
      });

      if (!tree?.shareEnabled) {
        return Response.json({ errorCode: "ERR_MEMBER_PHOTO_NOT_FOUND" }, { status: 404 });
      }
    }

    const member = await prisma.treeMember.findFirst({
      where: {
        id: memberId,
        treeId,
      },
      select: {
        photoKey: true,
      },
    });

    if (!member?.photoKey) {
      return Response.json({ errorCode: "ERR_MEMBER_PHOTO_NOT_FOUND" }, { status: 404 });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      console.error("S3_BUCKET is required for member photo downloads");
      return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
    }

    const photo = await downloadPhotoByKey({
      s3Client: createS3Client(),
      bucket,
      key: member.photoKey,
    });

    const body = Uint8Array.from(photo.body);

    return new Response(body.buffer, {
      status: 200,
      headers: {
        "Content-Type": photo.contentType ?? "image/webp",
        "Cache-Control": session?.user ? "private, max-age=60" : "public, max-age=60",
      },
    });
  } catch (error) {
    if (isPhotoNotFoundError(error)) {
      return Response.json({ errorCode: "ERR_MEMBER_PHOTO_NOT_FOUND" }, { status: 404 });
    }

    console.error("Error reading member photo:", error);
    return Response.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
