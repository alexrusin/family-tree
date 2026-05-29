import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { acceptInvitation } from "@/lib/tree-domain/collaboration-service";
import { hashInvitationToken } from "@/lib/tree-domain/invitation-token";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { errorCode: "ERR_UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { token } = await params;
    const tokenHash = hashInvitationToken(token);
    const prisma = getPrismaClient();

    const accepted = await acceptInvitation({
      repo: {
        findActiveInvitationByTokenHash: async (value) => {
          const invitation = await prisma.invitation.findUnique({
            where: {
              tokenHash: value,
            },
            select: {
              id: true,
              treeId: true,
              invitedEmail: true,
              role: true,
              status: true,
              expiresAt: true,
            },
          });

          if (!invitation || invitation.status !== "pending") {
            return null;
          }

          return {
            id: invitation.id,
            treeId: invitation.treeId,
            invitedEmail: invitation.invitedEmail,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
          };
        },
        upsertCollaborator: ({ treeId, userId, role, acceptedAt }) =>
          prisma.collaborator.upsert({
            where: {
              treeId_userId: {
                treeId,
                userId,
              },
            },
            create: {
              treeId,
              userId,
              role,
              invitedAt: acceptedAt,
              acceptedAt,
            },
            update: {
              role,
              acceptedAt,
            },
            select: {
              id: true,
              treeId: true,
              role: true,
            },
          }),
        markInvitationAccepted: (invitationId, acceptedAt) =>
          prisma.invitation
            .update({
              where: {
                id: invitationId,
              },
              data: {
                status: "accepted",
                acceptedAt,
                cancelledAt: null,
              },
            })
            .then(() => undefined),
      },
      tokenHash,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
    });

    return NextResponse.json(
      {
        success: true,
        treeId: accepted.treeId,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_UNAUTHORIZED") {
        return NextResponse.json(
          { errorCode: "ERR_UNAUTHORIZED" },
          { status: 401 },
        );
      }

      if (error.message === "ERR_INVITATION_EMAIL_MISMATCH") {
        return NextResponse.json(
          { errorCode: "ERR_INVITATION_EMAIL_MISMATCH" },
          { status: 409 },
        );
      }

      if (error.message === "ERR_INVITATION_EXPIRED") {
        return NextResponse.json(
          { errorCode: "ERR_INVITATION_EXPIRED" },
          { status: 410 },
        );
      }

      if (error.message === "ERR_INVITATION_NOT_FOUND") {
        return NextResponse.json(
          { errorCode: "ERR_INVITATION_NOT_FOUND" },
          { status: 404 },
        );
      }
    }

    console.error("Error accepting invitation:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
