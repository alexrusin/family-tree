import type { CollaboratorRole, Locale } from "@/generated/prisma/enums";
import { isInvitationExpired } from "./invitation-token";
import type { TreeRole } from "./tree-access";

export async function createOrRefreshInvitation(params: {
  repo: {
    getActorRole: (treeId: string, userId: string) => Promise<TreeRole>;
    findAcceptedCollaboratorByEmail: (
      treeId: string,
      email: string,
    ) => Promise<{ id: string } | null>;
    findPendingInvitationByEmail: (
      treeId: string,
      email: string,
    ) => Promise<{ id: string } | null>;
    upsertPendingInvitation: (args: {
      treeId: string;
      invitedEmail: string;
      role: CollaboratorRole;
      locale: Locale;
      message: string | null;
      tokenHash: string;
      expiresAt: Date;
    }) => Promise<{ id: string; status: "pending" }>;
  };
  actorUserId: string;
  treeId: string;
  invitedEmail: string;
  role: CollaboratorRole;
  locale: Locale;
  message: string | null;
  tokenHash: string;
  expiresAt: Date;
}): Promise<{ id: string; status: "pending" }> {
  const actorRole = await params.repo.getActorRole(
    params.treeId,
    params.actorUserId,
  );
  if (actorRole !== "owner") {
    throw new Error("ERR_FORBIDDEN");
  }

  const normalizedEmail = params.invitedEmail.trim().toLowerCase();
  const existingCollaborator =
    await params.repo.findAcceptedCollaboratorByEmail(
      params.treeId,
      normalizedEmail,
    );
  if (existingCollaborator) {
    throw new Error("ERR_ALREADY_COLLABORATOR");
  }

  await params.repo.findPendingInvitationByEmail(
    params.treeId,
    normalizedEmail,
  );

  return params.repo.upsertPendingInvitation({
    treeId: params.treeId,
    invitedEmail: normalizedEmail,
    role: params.role,
    locale: params.locale,
    message: params.message,
    tokenHash: params.tokenHash,
    expiresAt: params.expiresAt,
  });
}

export async function acceptInvitation(params: {
  repo: {
    findActiveInvitationByTokenHash: (tokenHash: string) => Promise<{
      id: string;
      treeId: string;
      invitedEmail: string;
      role: CollaboratorRole;
      expiresAt: Date;
    } | null>;
    upsertCollaborator: (args: {
      treeId: string;
      userId: string;
      role: CollaboratorRole;
      acceptedAt: Date;
    }) => Promise<{ id: string; treeId: string; role: CollaboratorRole }>;
    markInvitationAccepted: (
      invitationId: string,
      acceptedAt: Date,
    ) => Promise<void>;
  };
  tokenHash: string;
  actorUserId: string;
  actorEmail: string;
  now?: Date;
}): Promise<{ treeId: string; role: CollaboratorRole }> {
  const now = params.now ?? new Date();
  const invitation = await params.repo.findActiveInvitationByTokenHash(
    params.tokenHash,
  );

  if (!invitation) {
    throw new Error("ERR_INVITATION_NOT_FOUND");
  }

  if (isInvitationExpired(invitation.expiresAt, now)) {
    throw new Error("ERR_INVITATION_EXPIRED");
  }

  if (
    invitation.invitedEmail.toLowerCase() !==
    params.actorEmail.trim().toLowerCase()
  ) {
    throw new Error("ERR_INVITATION_EMAIL_MISMATCH");
  }

  const collaborator = await params.repo.upsertCollaborator({
    treeId: invitation.treeId,
    userId: params.actorUserId,
    role: invitation.role,
    acceptedAt: now,
  });

  await params.repo.markInvitationAccepted(invitation.id, now);

  return {
    treeId: collaborator.treeId,
    role: collaborator.role,
  };
}

export async function changeCollaboratorRole(params: {
  repo: {
    getActorRole: (treeId: string, userId: string) => Promise<TreeRole>;
    updateCollaboratorRole: (
      treeId: string,
      collaboratorId: string,
      role: CollaboratorRole,
    ) => Promise<void>;
  };
  actorUserId: string;
  treeId: string;
  collaboratorId: string;
  role: CollaboratorRole;
}): Promise<void> {
  const actorRole = await params.repo.getActorRole(
    params.treeId,
    params.actorUserId,
  );
  if (actorRole !== "owner") {
    throw new Error("ERR_FORBIDDEN");
  }

  await params.repo.updateCollaboratorRole(
    params.treeId,
    params.collaboratorId,
    params.role,
  );
}

export async function removeCollaborator(params: {
  repo: {
    getActorRole: (treeId: string, userId: string) => Promise<TreeRole>;
    deleteCollaborator: (
      treeId: string,
      collaboratorId: string,
    ) => Promise<void>;
  };
  actorUserId: string;
  treeId: string;
  collaboratorId: string;
}): Promise<void> {
  const actorRole = await params.repo.getActorRole(
    params.treeId,
    params.actorUserId,
  );
  if (actorRole !== "owner") {
    throw new Error("ERR_FORBIDDEN");
  }

  await params.repo.deleteCollaborator(params.treeId, params.collaboratorId);
}

export async function leaveTree(params: {
  repo: {
    getActorRole: (treeId: string, userId: string) => Promise<TreeRole>;
    deleteCollaboratorByUser: (treeId: string, userId: string) => Promise<void>;
  };
  actorUserId: string;
  treeId: string;
}): Promise<void> {
  const role = await params.repo.getActorRole(
    params.treeId,
    params.actorUserId,
  );
  if (role === "owner") {
    throw new Error("ERR_OWNER_CANNOT_LEAVE");
  }
  if (role === "none") {
    throw new Error("ERR_FORBIDDEN");
  }

  await params.repo.deleteCollaboratorByUser(params.treeId, params.actorUserId);
}
