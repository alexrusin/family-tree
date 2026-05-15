"use client";

import { Mail, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  INVITE_MESSAGE_MAX_LENGTH,
  normalizeInviteInput,
  type InviteRole,
  validateInviteInput,
} from "./invite-form-state";

interface InviteModalDictionary {
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
}

interface CollaborationDictionary {
  errors: {
    generic: string;
    [key: string]: string;
  };
  roles: {
    editor: string;
    viewer: string;
  };
  inviteModal: InviteModalDictionary;
}

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  treeId: string;
  t: CollaborationDictionary;
  onClose: () => void;
  onInvited: () => Promise<void> | void;
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

export default function InviteCollaboratorModal({
  isOpen,
  treeId,
  t,
  onClose,
  onInvited,
}: InviteCollaboratorModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("editor");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => {
      emailRef.current?.focus();
    }, 0);
  }, [isOpen]);

  const resetForm = () => {
    setEmail("");
    setRole("editor");
    setMessage("");
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateInviteInput({ email, role, message });
    if (validationError) {
      setError(mapErrorCode(validationError, t.errors));
      return;
    }

    const payload = normalizeInviteInput({ email, role, message });

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/collaboration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: payload.email,
          role: payload.role,
          message: payload.message,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setError(mapErrorCode(body?.errorCode, t.errors));
        return;
      }

      await onInvited();
      handleClose();
    } catch {
      setError(t.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/25 backdrop-blur-sm px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl border border-stone-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {t.inviteModal.title}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {t.inviteModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label={t.inviteModal.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.inviteModal.emailLabel}
            </label>
            <div className="relative">
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent text-stone-900 placeholder-stone-400"
                placeholder={t.inviteModal.emailPlaceholder}
                disabled={isSubmitting}
              />
              <Mail className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold text-stone-900 mb-2">
              {t.inviteModal.roleLabel}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-stone-50 p-3 cursor-pointer hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="collaborator-role"
                    value="editor"
                    checked={role === "editor"}
                    onChange={() => setRole("editor")}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm font-semibold text-stone-900">
                    {t.roles.editor}
                  </span>
                </div>
                <span className="text-xs text-stone-500">
                  {t.inviteModal.roleEditorHint}
                </span>
              </label>
              <label className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-stone-50 p-3 cursor-pointer hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="collaborator-role"
                    value="viewer"
                    checked={role === "viewer"}
                    onChange={() => setRole("viewer")}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm font-semibold text-stone-900">
                    {t.roles.viewer}
                  </span>
                </div>
                <span className="text-xs text-stone-500">
                  {t.inviteModal.roleViewerHint}
                </span>
              </label>
            </div>
          </fieldset>

          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.inviteModal.messageLabel}
              <span className="ml-1 text-stone-500 font-normal">
                ({t.inviteModal.messageOptional})
              </span>
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={INVITE_MESSAGE_MAX_LENGTH + 50}
              disabled={isSubmitting}
              placeholder={t.inviteModal.messagePlaceholder}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-900 focus:border-transparent text-stone-900 placeholder-stone-400 resize-none"
            />
            <p className="text-xs text-stone-500 mt-2 text-right">
              {t.inviteModal.messageCounter.replace(
                "{count}",
                String(message.trim().length),
              )}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="pt-1 flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-amber-900 text-white font-semibold text-sm hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t.inviteModal.sending : t.inviteModal.send}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors disabled:opacity-60"
            >
              {t.inviteModal.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
