import { NextResponse } from "next/server";
import type { CollaboratorRole, Locale } from "@/generated/prisma/enums";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { createOrRefreshInvitation } from "@/lib/tree-domain/collaboration-service";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/tree-domain/invitation-token";
import { getTreeRole } from "@/lib/tree-domain/tree-access";
import { resolveAvatarUrlForUser } from "@/lib/avatar-storage";
import { withTreeRole } from "@/lib/with-tree-role";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitationPayload = {
  email: string;
  role: CollaboratorRole;
  message: string | null;
};

function toLocale(value: unknown): Locale {
  if (value === "es") return "es";
  if (value === "ru") return "ru";
  return "en";
}

function parseInvitationPayload(value: unknown): InvitationPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const body = value as {
    email?: unknown;
    role?: unknown;
    message?: unknown;
  };

  if (typeof body.email !== "string") {
    return null;
  }

  const email = body.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return null;
  }

  if (body.role !== "editor" && body.role !== "viewer") {
    return null;
  }

  let message: string | null = null;
  if (body.message !== undefined && body.message !== null) {
    if (typeof body.message !== "string") {
      return null;
    }
    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length > 500) {
      return null;
    }
    message = trimmedMessage.length > 0 ? trimmedMessage : null;
  }

  return {
    email,
    role: body.role,
    message,
  };
}

export const GET = withTreeRole<{ treeId: string }>(
  "viewer",
  async (ctx) => {
    const { treeId } = ctx.params;

    const collaborators = await ctx.prisma.collaborator.findMany({
      where: {
        treeId,
        acceptedAt: {
          not: null,
        },
      },
      orderBy: {
        acceptedAt: "asc",
      },
      select: {
        id: true,
        treeId: true,
        userId: true,
        role: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            locale: true,
          },
        },
      },
    });

    const invitations =
      ctx.role === "owner"
        ? await ctx.prisma.invitation.findMany({
            where: {
              treeId,
              status: "pending",
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              treeId: true,
              invitedEmail: true,
              role: true,
              message: true,
              locale: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : [];

    return NextResponse.json(
      {
        collaborators: collaborators.map((collaborator) => ({
          ...collaborator,
          user: collaborator.user
            ? {
                ...collaborator.user,
                image: resolveAvatarUrlForUser(
                  collaborator.user.id,
                  collaborator.user.image,
                ),
              }
            : collaborator.user,
        })),
        invitations,
      },
      { status: 200 },
    );
  },
);

export const POST = withTreeRole<{ treeId: string }>(
  "owner",
  async (ctx) => {
    const body = await ctx.request.json().catch(() => null);
    const payload = parseInvitationPayload(body);

    if (!payload) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_INVITATION" },
        { status: 400 },
      );
    }

    if (
      ctx.user.email &&
      payload.email === (ctx.user.email as string).trim().toLowerCase()
    ) {
      return NextResponse.json(
        { errorCode: "ERR_CANNOT_INVITE_SELF" },
        { status: 409 },
      );
    }

    const { treeId } = ctx.params;
    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiresAt();

    const ownerLocale = toLocale((ctx.user as { locale?: string }).locale);
    let invitedUserCache: { id: string; locale: Locale } | null | undefined;

    const findInvitedUserByEmail = async (email: string) => {
      if (invitedUserCache !== undefined && email === payload.email) {
        return invitedUserCache;
      }

      const invitedUser = await ctx.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          locale: true,
        },
      });

      if (email === payload.email) {
        invitedUserCache = invitedUser;
      }

      return invitedUser;
    };

    const invitedUser = await findInvitedUserByEmail(payload.email);
    const invitationLocale = invitedUser?.locale ?? ownerLocale;

    await createOrRefreshInvitation({
      repo: {
        getActorRole: (tId, uId) => getTreeRole(ctx.prisma, tId, uId),
        findAcceptedCollaboratorByEmail: async (tId, invitedEmail) => {
          const invited = await findInvitedUserByEmail(invitedEmail);
          if (!invited) {
            return null;
          }

          const collaborator = await ctx.prisma.collaborator.findUnique({
            where: {
              treeId_userId: {
                treeId: tId,
                userId: invited.id,
              },
            },
            select: {
              id: true,
              acceptedAt: true,
            },
          });

          if (!collaborator?.acceptedAt) {
            return null;
          }

          return { id: collaborator.id };
        },
        upsertPendingInvitation: async (args) => {
          const existing = await ctx.prisma.invitation.findFirst({
            where: {
              treeId: args.treeId,
              invitedEmail: args.invitedEmail,
              status: "pending",
            },
            select: {
              id: true,
            },
          });

          if (existing) {
            const invitation = await ctx.prisma.invitation.update({
              where: { id: existing.id },
              data: {
                role: args.role,
                locale: args.locale,
                message: args.message,
                tokenHash: args.tokenHash,
                expiresAt: args.expiresAt,
                status: "pending",
                acceptedAt: null,
                cancelledAt: null,
              },
              select: {
                id: true,
              },
            });

            return {
              id: invitation.id,
              status: "pending" as const,
            };
          }

          const invitation = await ctx.prisma.invitation.create({
            data: {
              treeId: args.treeId,
              invitedEmail: args.invitedEmail,
              role: args.role,
              locale: args.locale,
              message: args.message,
              tokenHash: args.tokenHash,
              expiresAt: args.expiresAt,
            },
            select: {
              id: true,
            },
          });

          return {
            id: invitation.id,
            status: "pending" as const,
          };
        },
      },
      actorUserId: ctx.user.id,
      treeId,
      invitedEmail: payload.email,
      role: payload.role,
      locale: invitationLocale,
      message: payload.message,
      tokenHash,
      expiresAt,
    });

    const tree = await ctx.prisma.familyTree.findUnique({
      where: { id: treeId },
      select: {
        name: true,
      },
    });

    const inviteBaseUrl = process.env.BETTER_AUTH_URL;
    if (!inviteBaseUrl) {
      throw new Error("ERR_MISSING_BETTER_AUTH_URL");
    }

    const acceptUrl = new URL(
      `/${invitationLocale}/invitations/accept/${token}`,
      inviteBaseUrl,
    ).toString();

    const inviterName =
      (ctx.user.name as string | undefined)?.trim() ||
      (ctx.user.email as string | undefined) ||
      "Family Tree";

    await sendInvitationEmail({
      locale: invitationLocale,
      inviterName,
      treeName: tree?.name ?? "Family Tree",
      acceptUrl,
      role: payload.role,
      message: payload.message,
      to: payload.email,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  },
);
