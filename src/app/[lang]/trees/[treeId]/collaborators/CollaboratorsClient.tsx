"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Mail, UserMinus, Users } from "lucide-react";
import InviteCollaboratorModal from "./InviteCollaboratorModal";
import DestructiveConfirmation from "../../../components/DestructiveConfirmation";

type CollaboratorRole = "editor" | "viewer";

interface CollaboratorRecord {
  id: string;
  treeId: string;
  userId: string;
  role: CollaboratorRole;
  acceptedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface InvitationRecord {
  id: string;
  treeId: string;
  invitedEmail: string;
  role: CollaboratorRole;
  message: string | null;
  expiresAt: string;
}

interface CollaborationDictionary {
  title: string;
  subtitleOwner: string;
  subtitleCollaborator: string;
  backToTree: string;
  inviteButton: string;
  activeTitle: string;
  activeEmpty: string;
  pendingTitle: string;
  pendingEmpty: string;
  resend: string;
  resending: string;
  cancelInvite: string;
  cancelling: string;
  remove: string;
  removing: string;
  leaveTree: string;
  leavingTree: string;
  invitedRole: string;
  expiresAt: string;
  joinedAt: string;
  you: string;
  resendSuccess: string;
  cancelSuccess: string;
  removeSuccess: string;
  inviteSuccess: string;
  roles: {
    owner: string;
    editor: string;
    viewer: string;
  };
  inviteModal: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    roleLabel: string;
    roleEditorHint: string;
    roleViewerHint: string;
    messageLabel: string;
    messageOptional: string;
    messagePlaceholder: string;
    messageCounter: string;
    cancel: string;
    send: string;
    sending: string;
  };
  removeModal: {
    title: string;
    body: string;
    warning: string;
    cancel: string;
    confirm: string;
  };
  errors: {
    loadFailed: string;
    generic: string;
    [key: string]: string;
  };
}

interface CollaboratorsClientProps {
  lang: string;
  treeId: string;
  treeName: string;
  isOwner: boolean;
  currentUser: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  initialCollaborators: CollaboratorRecord[];
  initialInvitations: InvitationRecord[];
  t: CollaborationDictionary;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errors: CollaborationDictionary["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }

  return errors.generic;
}

export default function CollaboratorsClient({
  lang,
  treeId,
  treeName,
  isOwner,
  currentUser,
  initialCollaborators,
  initialInvitations,
  t,
}: CollaboratorsClientProps) {
  const router = useRouter();
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [resendingInvitationId, setResendingInvitationId] = useState<
    string | null
  >(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<
    string | null
  >(null);
  const [removingCollaboratorId, setRemovingCollaboratorId] = useState<
    string | null
  >(null);
  const [collaboratorToRemove, setCollaboratorToRemove] =
    useState<CollaboratorRecord | null>(null);
  const [isLeavingTree, setIsLeavingTree] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [lang],
  );

  const formatDate = useCallback(
    (value: string) => dateFormatter.format(new Date(value)),
    [dateFormatter],
  );

  const roleLabel = useCallback(
    (role: CollaboratorRole) =>
      role === "editor" ? t.roles.editor : t.roles.viewer,
    [t.roles.editor, t.roles.viewer],
  );

  const loadCollaborationData = useCallback(async () => {
    try {
      const response = await fetch(`/api/trees/${treeId}/collaboration`, {
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        collaborators?: CollaboratorRecord[];
        invitations?: InvitationRecord[];
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setCollaborators(payload?.collaborators ?? []);
      setInvitations(payload?.invitations ?? []);
      setActionError(null);
    } catch {
      setActionError(t.errors.loadFailed);
    }
  }, [t.errors, treeId]);

  const handleResendInvitation = async (invitationId: string) => {
    setActionError(null);
    setActionMessage(null);
    setResendingInvitationId(invitationId);

    try {
      const response = await fetch(
        `/api/trees/${treeId}/collaboration/invitations/${invitationId}`,
        {
          method: "PATCH",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setActionMessage(t.resendSuccess);
      await loadCollaborationData();
    } catch {
      setActionError(t.errors.generic);
    } finally {
      setResendingInvitationId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setActionError(null);
    setActionMessage(null);
    setCancellingInvitationId(invitationId);

    try {
      const response = await fetch(
        `/api/trees/${treeId}/collaboration/invitations/${invitationId}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      setActionMessage(t.cancelSuccess);
    } catch {
      setActionError(t.errors.generic);
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    setActionError(null);
    setActionMessage(null);
    setRemovingCollaboratorId(collaboratorId);

    try {
      const response = await fetch(
        `/api/trees/${treeId}/collaboration/collaborators/${collaboratorId}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setCollaborators((current) =>
        current.filter((collaborator) => collaborator.id !== collaboratorId),
      );
      setActionMessage(t.removeSuccess);
      setCollaboratorToRemove(null);
    } catch {
      setActionError(t.errors.generic);
    } finally {
      setRemovingCollaboratorId(null);
    }
  };

  const handleLeaveTree = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsLeavingTree(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/collaboration/leave`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      router.replace(`/${lang}/dashboard`);
    } catch {
      setActionError(t.errors.generic);
    } finally {
      setIsLeavingTree(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-on-background px-4 py-8 md:px-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/${lang}/trees/${treeId}`}
            className="text-sm font-semibold text-amber-900 hover:text-amber-700 transition-colors"
          >
            {t.backToTree}
          </Link>
        </div>

        <section className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm shadow-amber-900/5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold text-amber-900">
                {t.title}
              </h1>
              <p className="text-stone-600 mt-2 max-w-2xl">
                {isOwner ? t.subtitleOwner : t.subtitleCollaborator}
              </p>
              <p className="text-sm text-stone-500 mt-1">{treeName}</p>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setActionMessage(null);
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-900 text-white text-sm font-semibold hover:bg-amber-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t.inviteButton}
              </button>
            )}
          </div>
        </section>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {actionMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        )}

        <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm shadow-amber-900/5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-900" />
            <h2 className="text-xl font-semibold text-stone-900">
              {t.activeTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isOwner && (
              <article className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-900 font-semibold overflow-hidden">
                    {currentUser.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentUser.image}
                        alt={
                          currentUser.name || currentUser.email || t.roles.owner
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (currentUser.name || currentUser.email || "?")
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">
                      {currentUser.name || currentUser.email || t.roles.owner}
                    </p>
                    <p className="text-xs text-stone-500">{t.you}</p>
                  </div>
                </div>
                <div className="mt-4 inline-flex px-2.5 py-1 rounded-full bg-amber-900 text-white text-xs font-semibold">
                  {t.roles.owner}
                </div>
              </article>
            )}

            {collaborators.map((collaborator) => {
              const displayName =
                collaborator.user.name?.trim() || collaborator.user.email;

              return (
                <article
                  key={collaborator.id}
                  className="rounded-xl border border-stone-200 bg-stone-50/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-semibold overflow-hidden">
                      {collaborator.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={collaborator.user.image}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        displayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        {collaborator.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700">
                      {roleLabel(collaborator.role)}
                    </span>
                    {collaborator.acceptedAt && (
                      <span className="text-xs text-stone-500 text-right">
                        {t.joinedAt.replace(
                          "{date}",
                          formatDate(collaborator.acceptedAt),
                        )}
                      </span>
                    )}
                  </div>

                  {isOwner && (
                    <div className="mt-4 pt-4 border-t border-stone-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setActionMessage(null);
                          setCollaboratorToRemove(collaborator);
                        }}
                        disabled={removingCollaboratorId === collaborator.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        {removingCollaboratorId === collaborator.id
                          ? t.removing
                          : t.remove}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {collaborators.length === 0 && (
            <p className="text-sm text-stone-500 mt-4">{t.activeEmpty}</p>
          )}
        </section>

        {isOwner ? (
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm shadow-amber-900/5">
            <h2 className="text-xl font-semibold text-stone-900 mb-4">
              {t.pendingTitle}
            </h2>

            {invitations.length === 0 ? (
              <p className="text-sm text-stone-500">{t.pendingEmpty}</p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => {
                  const isResending = resendingInvitationId === invitation.id;
                  const isCancelling = cancellingInvitationId === invitation.id;

                  return (
                    <article
                      key={invitation.id}
                      className="rounded-xl border border-stone-200 bg-stone-50/40 p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-stone-900">
                            {invitation.invitedEmail}
                          </p>
                          <p className="text-xs text-stone-500 mt-1">
                            {t.invitedRole.replace(
                              "{role}",
                              roleLabel(invitation.role),
                            )}
                          </p>
                          <p className="text-xs text-stone-500 mt-1">
                            {t.expiresAt.replace(
                              "{date}",
                              formatDate(invitation.expiresAt),
                            )}
                          </p>
                          {invitation.message && (
                            <p className="text-sm text-stone-600 mt-2 italic">
                              {invitation.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 md:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              void handleResendInvitation(invitation.id);
                            }}
                            disabled={isResending || isCancelling}
                            className="px-3 py-2 rounded-lg bg-amber-900 text-white text-xs font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isResending ? t.resending : t.resend}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleCancelInvitation(invitation.id);
                            }}
                            disabled={isResending || isCancelling}
                            className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isCancelling ? t.cancelling : t.cancelInvite}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm shadow-amber-900/5">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">
              {t.leaveTree}
            </h2>
            <p className="text-sm text-stone-500 mb-4">{treeName}</p>
            <button
              type="button"
              onClick={() => {
                void handleLeaveTree();
              }}
              disabled={isLeavingTree}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserMinus className="w-4 h-4" />
              {isLeavingTree ? t.leavingTree : t.leaveTree}
            </button>
          </section>
        )}
      </div>

      {isOwner && (
        <InviteCollaboratorModal
          isOpen={isInviteModalOpen}
          treeId={treeId}
          t={{
            roles: {
              editor: t.roles.editor,
              viewer: t.roles.viewer,
            },
            inviteModal: t.inviteModal,
            errors: t.errors,
          }}
          onClose={() => setIsInviteModalOpen(false)}
          onInvited={async () => {
            setActionError(null);
            setActionMessage(t.inviteSuccess);
            await loadCollaborationData();
          }}
        />
      )}

      {isOwner && (
        <DestructiveConfirmation
          isOpen={collaboratorToRemove !== null}
          isBusy={
            collaboratorToRemove !== null &&
            removingCollaboratorId === collaboratorToRemove.id
          }
          subject={
            collaboratorToRemove
              ? collaboratorToRemove.user.name?.trim() ||
                collaboratorToRemove.user.email
              : ""
          }
          onClose={() => {
            if (removingCollaboratorId) return;
            setCollaboratorToRemove(null);
          }}
          onConfirm={() => {
            if (collaboratorToRemove) {
              void handleRemoveCollaborator(collaboratorToRemove.id);
            }
          }}
          t={{
            title: t.removeModal.title,
            body: t.removeModal.body,
            warning: t.removeModal.warning,
            cancel: t.removeModal.cancel,
            confirm: t.removeModal.confirm,
            busy: t.removing,
          }}
        />
      )}
    </main>
  );
}
