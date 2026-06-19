import { NextResponse } from "next/server";
import { sendInvitationEmail } from "@/lib/invitation-email";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/tree-domain/invitation-token";
import { withTreeRole } from "@/lib/with-tree-role";

export const PATCH = withTreeRole<{ treeId: string; invitationId: string }>(
  "owner",
  async (ctx) => {
    const { treeId, invitationId } = ctx.params;

    const invitation = await ctx.prisma.invitation.findFirst({
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

    const tree = await ctx.prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { name: true },
    });

    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiresAt();

    await ctx.prisma.invitation.update({
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
      (ctx.user.name as string | undefined)?.trim() ||
      (ctx.user.email as string | undefined) ||
      "Family Tree";

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
  },
);

export const DELETE = withTreeRole<{ treeId: string; invitationId: string }>(
  "owner",
  async (ctx) => {
    const { treeId, invitationId } = ctx.params;

    const invitation = await ctx.prisma.invitation.findFirst({
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

    await ctx.prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  },
);
