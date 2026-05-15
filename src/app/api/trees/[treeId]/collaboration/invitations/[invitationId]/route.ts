import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/invitation-email";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/tree-domain/invitation-token";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; invitationId: string }> },
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

    const { treeId, invitationId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role !== "owner") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        treeId,
        status: "pending",
      },
      select: {
        id: true,
        invitedEmail: true,
        role: true,
        message: true,
        locale: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { errorCode: "ERR_INVITATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { name: true },
    });

    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiresAt();

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash,
        expiresAt,
        status: "pending",
        acceptedAt: null,
        cancelledAt: null,
      },
    });

    const inviteBaseUrl = process.env.BETTER_AUTH_URL;
    if (!inviteBaseUrl) {
      throw new Error("ERR_MISSING_BETTER_AUTH_URL");
    }

    const acceptUrl = new URL(
      `/${invitation.locale}/invitations/accept/${token}`,
      inviteBaseUrl,
    ).toString();

    const inviterName =
      session.user.name?.trim() || session.user.email || "Family Tree";

    await sendInvitationEmail({
      locale: invitation.locale,
      inviterName,
      treeName: tree?.name ?? "Family Tree",
      acceptUrl,
      role: invitation.role,
      message: invitation.message,
      to: invitation.invitedEmail,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string; invitationId: string }> },
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

    const { treeId, invitationId } = await params;
    const prisma = getPrismaClient();
    const role = await getTreeRole(prisma, treeId, session.user.id);

    if (role !== "owner") {
      return NextResponse.json({ errorCode: "ERR_FORBIDDEN" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        treeId,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { errorCode: "ERR_INVITATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    await prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}
