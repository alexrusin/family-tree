import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { CollaboratorRole, Locale } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { createOrRefreshInvitation } from "@/lib/tree-domain/collaboration-service";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/tree-domain/invitation-token";
import { getTreeRole } from "@/lib/tree-domain/tree-access";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitationPayload = {
  email: string;
  role: CollaboratorRole;
  message: string | null;
};

function getPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

function toLocale(value: unknown): Locale {
  return value === "ru" ? "ru" : "en";
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

    const collaborators = await prisma.collaborator.findMany({
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
      role === "owner"
        ? await prisma.invitation.findMany({
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

    return NextResponse.json({ collaborators, invitations }, { status: 200 });
  } catch (error) {
    console.error("Error listing collaborators:", error);
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

    const body = await request.json().catch(() => null);
    const payload = parseInvitationPayload(body);

    if (!payload) {
      return NextResponse.json(
        { errorCode: "ERR_INVALID_INVITATION" },
        { status: 400 },
      );
    }

    const { treeId } = await params;
    const prisma = getPrismaClient();
    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiresAt();

    const ownerLocale = toLocale((session.user as { locale?: string }).locale);
    let invitedUserCache: { id: string; locale: Locale } | null | undefined;

    const findInvitedUserByEmail = async (email: string) => {
      if (invitedUserCache !== undefined && email === payload.email) {
        return invitedUserCache;
      }

      const invitedUser = await prisma.user.findUnique({
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
        getActorRole: (tId, uId) => getTreeRole(prisma, tId, uId),
        findAcceptedCollaboratorByEmail: async (tId, invitedEmail) => {
          const invited = await findInvitedUserByEmail(invitedEmail);
          if (!invited) {
            return null;
          }

          const collaborator = await prisma.collaborator.findUnique({
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
        findPendingInvitationByEmail: (tId, invitedEmail) =>
          prisma.invitation.findFirst({
            where: {
              treeId: tId,
              invitedEmail,
              status: "pending",
            },
            select: {
              id: true,
            },
          }),
        upsertPendingInvitation: async (args) => {
          const existing = await prisma.invitation.findFirst({
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
            return prisma.invitation.update({
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
                status: true,
              },
            });
          }

          return prisma.invitation.create({
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
              status: true,
            },
          });
        },
      },
      actorUserId: session.user.id,
      treeId,
      invitedEmail: payload.email,
      role: payload.role,
      locale: invitationLocale,
      message: payload.message,
      tokenHash,
      expiresAt,
    });

    const tree = await prisma.familyTree.findUnique({
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
      session.user.name?.trim() || session.user.email || "Family Tree";

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ERR_FORBIDDEN") {
        return NextResponse.json(
          { errorCode: "ERR_FORBIDDEN" },
          { status: 403 },
        );
      }
      if (error.message === "ERR_ALREADY_COLLABORATOR") {
        return NextResponse.json(
          { errorCode: "ERR_ALREADY_COLLABORATOR" },
          { status: 409 },
        );
      }
    }

    console.error("Error creating invitation:", error);
    return NextResponse.json({ errorCode: "ERR_INTERNAL" }, { status: 500 });
  }
}