"use client";

import { useEffect, useMemo, useState } from "react";
import {
  validateAccountEmailInput,
  validateAvatarSelection,
  validateDisplayNameInput,
} from "./account-form-state";

interface AccountTranslations {
  description: string;
  profileCardTitle: string;
  profileCardBody: string;
  avatarCardTitle: string;
  avatarCardBody: string;
  displayNameLabel: string;
  emailLabel: string;
  emailReadonlyHint: string;
  editDisplayName: string;
  editEmail: string;
  dialogTitle: string;
  dialogBody: string;
  displayNamePlaceholder: string;
  emailDialogTitle: string;
  emailDialogBody: string;
  newEmailLabel: string;
  newEmailPlaceholder: string;
  pendingEmailTitle: string;
  pendingEmailBody: string;
  pendingEmailResend: string;
  pendingEmailResending: string;
  emailChangeRequested: string;
  emailChangeResent: string;
  selectAvatar: string;
  avatarConstraints: string;
  avatarSelected: string;
  cancel: string;
  save: string;
  saving: string;
  avatarSave: string;
  avatarSaving: string;
  errors: {
    ERR_INVALID_DISPLAY_NAME: string;
    ERR_IMAGE_TOO_LARGE: string;
    ERR_UNSUPPORTED_IMAGE_TYPE: string;
    ERR_AVATAR_REQUIRED: string;
    ERR_UNAUTHORIZED: string;
    ERR_INTERNAL: string;
    generic: string;
    [key: string]: string;
  };
}

interface PendingEmailChange {
  email: string;
  expiresAt: string;
}

interface AccountProfile {
  id: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  pendingEmailChange: PendingEmailChange | null;
}

interface AccountSettingsClientProps {
  title: string;
  lang: string;
  initialProfile: AccountProfile;
  t: AccountTranslations;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errors: AccountTranslations["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }

  return errors.generic;
}

export default function AccountSettingsClient({
  title,
  lang,
  initialProfile,
  t,
}: AccountSettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(
    initialProfile.displayName ?? "",
  );
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailDialogError, setEmailDialogError] = useState<string | null>(null);
  const [emailActionError, setEmailActionError] = useState<string | null>(null);
  const [emailActionMessage, setEmailActionMessage] = useState<string | null>(
    null,
  );
  const [isSavingEmailChange, setIsSavingEmailChange] = useState(false);
  const [isResendingPendingEmail, setIsResendingPendingEmail] = useState(false);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const avatarFallback = useMemo(() => {
    const source = profile.displayName?.trim() || profile.email.trim() || "A";
    return source.charAt(0).toUpperCase();
  }, [profile.displayName, profile.email]);

  const pendingEmailDescription = useMemo(() => {
    if (!profile.pendingEmailChange) {
      return null;
    }

    return t.pendingEmailBody.replace(
      "{email}",
      profile.pendingEmailChange.email,
    );
  }, [profile.pendingEmailChange, t.pendingEmailBody]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/account", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as {
          profile?: AccountProfile;
        } | null;

        if (!active || !response.ok || !payload?.profile) {
          return;
        }

        setProfile(payload.profile);
      } catch {
        // Keep rendering with initial profile if background refresh fails.
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const openDisplayNameDialog = () => {
    setDisplayNameDraft(profile.displayName ?? "");
    setDisplayNameError(null);
    setIsEditDialogOpen(true);
  };

  const closeDisplayNameDialog = () => {
    if (isSavingDisplayName) {
      return;
    }

    setDisplayNameError(null);
    setDisplayNameDraft(profile.displayName ?? "");
    setIsEditDialogOpen(false);
  };

  const saveDisplayName = async () => {
    const validationError = validateDisplayNameInput(displayNameDraft);
    if (validationError) {
      setDisplayNameError(mapErrorCode(validationError, t.errors));
      return;
    }

    setIsSavingDisplayName(true);
    setDisplayNameError(null);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: displayNameDraft.trim() }),
      });

      const payload = (await response.json().catch(() => null)) as {
        profile?: AccountProfile;
        errorCode?: string;
      } | null;

      if (!response.ok || !payload?.profile) {
        setDisplayNameError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setProfile(payload.profile);
      setIsEditDialogOpen(false);
    } catch {
      setDisplayNameError(t.errors.generic);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const onAvatarSelected = (file: File | null) => {
    if (!file) {
      setSelectedAvatarFile(null);
      setAvatarError(null);
      return;
    }

    const validationError = validateAvatarSelection({
      sizeBytes: file.size,
      contentType: file.type,
    });

    if (validationError) {
      setSelectedAvatarFile(null);
      setAvatarError(mapErrorCode(validationError, t.errors));
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarError(null);
  };

  const saveAvatar = async () => {
    if (!selectedAvatarFile) {
      setAvatarError(mapErrorCode("ERR_AVATAR_REQUIRED", t.errors));
      return;
    }

    setIsSavingAvatar(true);
    setAvatarError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedAvatarFile);

      const response = await fetch("/api/account/avatar", {
        method: "PATCH",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        profile?: AccountProfile;
        errorCode?: string;
      } | null;

      if (!response.ok || !payload?.profile) {
        setAvatarError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setProfile((previous) => ({
        ...payload.profile,
        pendingEmailChange:
          payload.profile.pendingEmailChange ?? previous.pendingEmailChange,
      }));
      setSelectedAvatarFile(null);
    } catch {
      setAvatarError(t.errors.generic);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const openEmailDialog = () => {
    setEmailDraft("");
    setEmailDialogError(null);
    setEmailActionError(null);
    setEmailActionMessage(null);
    setIsEmailDialogOpen(true);
  };

  const closeEmailDialog = () => {
    if (isSavingEmailChange) {
      return;
    }

    setEmailDraft("");
    setEmailDialogError(null);
    setIsEmailDialogOpen(false);
  };

  const saveEmailChange = async () => {
    const validationError = validateAccountEmailInput(
      emailDraft,
      profile.email,
    );
    if (validationError) {
      setEmailDialogError(mapErrorCode(validationError, t.errors));
      return;
    }

    setIsSavingEmailChange(true);
    setEmailDialogError(null);
    setEmailActionError(null);
    setEmailActionMessage(null);

    try {
      const response = await fetch("/api/account/email-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailDraft.trim().toLowerCase(),
          locale: lang,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        pendingEmailChange?: PendingEmailChange;
        errorCode?: string;
      } | null;

      if (!response.ok || !payload?.pendingEmailChange) {
        setEmailDialogError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setProfile((previous) => ({
        ...previous,
        pendingEmailChange: payload.pendingEmailChange,
      }));
      setIsEmailDialogOpen(false);
      setEmailActionMessage(t.emailChangeRequested);
    } catch {
      setEmailDialogError(t.errors.generic);
    } finally {
      setIsSavingEmailChange(false);
    }
  };

  const resendPendingEmailChange = async () => {
    if (!profile.pendingEmailChange) {
      return;
    }

    setEmailActionError(null);
    setEmailActionMessage(null);
    setIsResendingPendingEmail(true);

    try {
      const response = await fetch("/api/account/email-change", {
        method: "PATCH",
      });

      const payload = (await response.json().catch(() => null)) as {
        pendingEmailChange?: PendingEmailChange;
        errorCode?: string;
      } | null;

      if (!response.ok || !payload?.pendingEmailChange) {
        setEmailActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setProfile((previous) => ({
        ...previous,
        pendingEmailChange: payload.pendingEmailChange,
      }));
      setEmailActionMessage(t.emailChangeResent);
    } catch {
      setEmailActionError(t.errors.generic);
    } finally {
      setIsResendingPendingEmail(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {t.description}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">
            {t.avatarCardTitle}
          </h3>
          <p className="mt-1 text-sm text-stone-600">{t.avatarCardBody}</p>

          <div className="mt-5 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-amber-100 text-2xl font-semibold text-amber-900 flex items-center justify-center">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName ?? profile.email}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarFallback
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm text-stone-600">
              <p className="truncate">
                {selectedAvatarFile
                  ? `${t.avatarSelected}: ${selectedAvatarFile.name}`
                  : t.avatarConstraints}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-stone-900 mb-2">
              {t.selectAvatar}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                onAvatarSelected(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
              className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
              disabled={isSavingAvatar}
            />
          </div>

          {avatarError ? (
            <p className="mt-3 text-sm text-red-600">{avatarError}</p>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200 disabled:opacity-60"
              onClick={() => {
                if (isSavingAvatar) {
                  return;
                }
                setSelectedAvatarFile(null);
                setAvatarError(null);
              }}
              disabled={isSavingAvatar || !selectedAvatarFile}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
              onClick={() => {
                void saveAvatar();
              }}
              disabled={isSavingAvatar || !selectedAvatarFile}
            >
              {isSavingAvatar ? t.avatarSaving : t.avatarSave}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">
            {t.profileCardTitle}
          </h3>
          <p className="mt-1 text-sm text-stone-600">{t.profileCardBody}</p>

          <dl className="mt-5 space-y-5">
            <div className="border-b border-stone-100 pb-4">
              <dt className="text-xs uppercase tracking-wide font-semibold text-stone-500">
                {t.displayNameLabel}
              </dt>
              <dd className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-900">
                  {profile.displayName}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  onClick={openDisplayNameDialog}
                >
                  {t.editDisplayName}
                </button>
              </dd>
            </div>

            <div>
              <dt className="text-xs uppercase tracking-wide font-semibold text-stone-500">
                {t.emailLabel}
              </dt>
              <dd className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-stone-900">
                  {profile.email}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  onClick={openEmailDialog}
                >
                  {t.editEmail}
                </button>
              </dd>
              <p className="mt-1 text-xs text-stone-500">
                {t.emailReadonlyHint}
              </p>

              {profile.pendingEmailChange ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    {t.pendingEmailTitle}
                  </p>
                  {pendingEmailDescription ? (
                    <p className="mt-1 text-sm text-amber-900/90">
                      {pendingEmailDescription}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-amber-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                    onClick={() => {
                      void resendPendingEmailChange();
                    }}
                    disabled={isResendingPendingEmail}
                  >
                    {isResendingPendingEmail
                      ? t.pendingEmailResending
                      : t.pendingEmailResend}
                  </button>
                </div>
              ) : null}

              {emailActionError ? (
                <p className="mt-2 text-sm text-red-600">{emailActionError}</p>
              ) : null}

              {emailActionMessage ? (
                <p className="mt-2 text-sm text-green-700">
                  {emailActionMessage}
                </p>
              ) : null}
            </div>
          </dl>
        </section>
      </div>

      {isEditDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white shadow-xl">
            <div className="border-b border-stone-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-stone-900">
                {t.dialogTitle}
              </h3>
              <p className="mt-1 text-sm text-stone-600">{t.dialogBody}</p>
            </div>

            <div className="px-6 py-5 space-y-3">
              <label className="block text-sm font-semibold text-stone-900">
                {t.displayNameLabel}
              </label>
              <input
                type="text"
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.target.value)}
                placeholder={t.displayNamePlaceholder}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900"
                disabled={isSavingDisplayName}
              />

              {displayNameError ? (
                <p className="text-sm text-red-600">{displayNameError}</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
              <button
                type="button"
                className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200 disabled:opacity-60"
                onClick={closeDisplayNameDialog}
                disabled={isSavingDisplayName}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                onClick={() => {
                  void saveDisplayName();
                }}
                disabled={isSavingDisplayName}
              >
                {isSavingDisplayName ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEmailDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white shadow-xl">
            <div className="border-b border-stone-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-stone-900">
                {t.emailDialogTitle}
              </h3>
              <p className="mt-1 text-sm text-stone-600">{t.emailDialogBody}</p>
            </div>

            <div className="px-6 py-5 space-y-3">
              <label className="block text-sm font-semibold text-stone-900">
                {t.newEmailLabel}
              </label>
              <input
                type="email"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                placeholder={t.newEmailPlaceholder}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900"
                disabled={isSavingEmailChange}
              />

              {emailDialogError ? (
                <p className="text-sm text-red-600">{emailDialogError}</p>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
              <button
                type="button"
                className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-200 disabled:opacity-60"
                onClick={closeEmailDialog}
                disabled={isSavingEmailChange}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                onClick={() => {
                  void saveEmailChange();
                }}
                disabled={isSavingEmailChange}
              >
                {isSavingEmailChange ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
