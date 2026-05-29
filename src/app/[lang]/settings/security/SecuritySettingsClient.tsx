"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  type ChangePasswordValidationErrors,
  type DeleteAccountValidationErrors,
  validateChangePasswordInput,
  validateDeleteAccountInput,
} from "./security-form-state";

interface SecurityTranslations {
  description: string;
  changePasswordTitle: string;
  changePasswordBody: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordHint: string;
  save: string;
  saving: string;
  successMessage: string;
  dangerZoneTitle: string;
  dangerZoneBody: string;
  deleteCurrentPasswordLabel: string;
  deleteCurrentPasswordPlaceholder: string;
  deleteConfirmationLabel: string;
  deleteConfirmationPlaceholder: string;
  deleteConfirmationHint: string;
  deleteImpactOwnedTrees: string;
  deleteImpactCollaboratorAccess: string;
  deleteImpactOtherOwners: string;
  deleteAccount: string;
  deletingAccount: string;
  errors: {
    ERR_CURRENT_PASSWORD_REQUIRED: string;
    ERR_NEW_PASSWORD_REQUIRED: string;
    ERR_CONFIRM_PASSWORD_REQUIRED: string;
    ERR_PASSWORD_MISMATCH: string;
    ERR_WEAK_PASSWORD: string;
    ERR_INVALID_CURRENT_PASSWORD: string;
    ERR_DELETE_CONFIRMATION_REQUIRED: string;
    ERR_DELETE_CONFIRMATION_MISMATCH: string;
    ERR_ACCOUNT_DELETE_FAILED: string;
    ERR_UNAUTHORIZED: string;
    ERR_INTERNAL: string;
    generic: string;
    [key: string]: string;
  };
}

interface SecuritySettingsClientProps {
  title: string;
  lang: string;
  t: SecurityTranslations;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

interface DeleteFormErrors {
  currentPassword?: string;
  confirmationPhrase?: string;
  form?: string;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errors: SecurityTranslations["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }

  return errors.generic;
}

function hasValidationErrors(errors: ChangePasswordValidationErrors): boolean {
  return Boolean(
    errors.currentPassword || errors.newPassword || errors.confirmPassword,
  );
}

function hasDeleteValidationErrors(
  errors: DeleteAccountValidationErrors,
): boolean {
  return Boolean(errors.currentPassword || errors.confirmationPhrase);
}

export default function SecuritySettingsClient({
  title,
  lang,
  t,
}: SecuritySettingsClientProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState("");
  const [deleteConfirmationPhrase, setDeleteConfirmationPhrase] = useState("");
  const [deleteErrors, setDeleteErrors] = useState<DeleteFormErrors>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const canDeleteAccount =
    deleteCurrentPassword.trim().length > 0 &&
    deleteConfirmationPhrase === DELETE_ACCOUNT_CONFIRMATION_PHRASE;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (hasValidationErrors(validationErrors)) {
      setErrors({
        currentPassword: validationErrors.currentPassword
          ? mapErrorCode(validationErrors.currentPassword, t.errors)
          : undefined,
        newPassword: validationErrors.newPassword
          ? mapErrorCode(validationErrors.newPassword, t.errors)
          : undefined,
        confirmPassword: validationErrors.confirmPassword
          ? mapErrorCode(validationErrors.confirmPassword, t.errors)
          : undefined,
      });
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setErrors({
          form: mapErrorCode(payload?.errorCode, t.errors),
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(t.successMessage);
    } catch {
      setErrors({ form: t.errors.generic });
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateDeleteAccountInput({
      currentPassword: deleteCurrentPassword,
      confirmationPhrase: deleteConfirmationPhrase,
    });

    if (hasDeleteValidationErrors(validationErrors)) {
      setDeleteErrors({
        currentPassword: validationErrors.currentPassword
          ? mapErrorCode(validationErrors.currentPassword, t.errors)
          : undefined,
        confirmationPhrase: validationErrors.confirmationPhrase
          ? mapErrorCode(validationErrors.confirmationPhrase, t.errors)
          : undefined,
      });
      return;
    }

    setIsDeleting(true);
    setDeleteErrors({});

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: deleteCurrentPassword,
          confirmationPhrase: deleteConfirmationPhrase,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        errorCode?: string;
      } | null;

      if (!response.ok) {
        setDeleteErrors({
          form: mapErrorCode(payload?.errorCode, t.errors),
        });
        return;
      }

      router.replace(`/${lang}/login`);
      router.refresh();
    } catch {
      setDeleteErrors({
        form: t.errors.ERR_ACCOUNT_DELETE_FAILED ?? t.errors.generic,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {t.description}
      </p>

      <div className="mt-8 border-t border-stone-200 pt-8">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <div>
            <h3 className="text-xl font-semibold text-stone-900">
              {t.changePasswordTitle}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {t.changePasswordBody}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-stone-800"
              >
                {t.currentPasswordLabel}
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={t.currentPasswordPlaceholder}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-800 outline-none transition-colors focus:border-amber-400"
              />
              {errors.currentPassword ? (
                <p className="text-sm text-red-700">{errors.currentPassword}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-stone-800"
              >
                {t.newPasswordLabel}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={t.newPasswordPlaceholder}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-800 outline-none transition-colors focus:border-amber-400"
              />
              <p className="text-xs text-stone-500">{t.passwordHint}</p>
              {errors.newPassword ? (
                <p className="text-sm text-red-700">{errors.newPassword}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-stone-800"
              >
                {t.confirmPasswordLabel}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t.confirmPasswordPlaceholder}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-800 outline-none transition-colors focus:border-amber-400"
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-700">{errors.confirmPassword}</p>
              ) : null}
            </div>

            {errors.form ? (
              <p className="text-sm text-red-700">{errors.form}</p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-amber-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? t.saving : t.save}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50/70 p-5 md:p-7">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-semibold text-red-700">
              {t.dangerZoneTitle}
            </h3>
            <p className="mt-2 text-base leading-7 text-stone-800">
              {t.dangerZoneBody}
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-700">
              <li>{t.deleteImpactOwnedTrees}</li>
              <li>{t.deleteImpactCollaboratorAccess}</li>
              <li>{t.deleteImpactOtherOwners}</li>
            </ul>
          </div>

          <form
            onSubmit={onDeleteAccount}
            className="mt-6 space-y-5"
            noValidate
          >
            <div className="space-y-2">
              <label
                htmlFor="deleteCurrentPassword"
                className="block text-sm font-medium text-stone-800"
              >
                {t.deleteCurrentPasswordLabel}
              </label>
              <input
                id="deleteCurrentPassword"
                name="deleteCurrentPassword"
                type="password"
                value={deleteCurrentPassword}
                onChange={(event) =>
                  setDeleteCurrentPassword(event.target.value)
                }
                placeholder={t.deleteCurrentPasswordPlaceholder}
                autoComplete="current-password"
                aria-invalid={Boolean(deleteErrors.currentPassword)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-stone-900 outline-none transition-colors focus:border-red-400"
              />
              {deleteErrors.currentPassword ? (
                <p className="text-sm text-red-700">
                  {deleteErrors.currentPassword}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="deleteConfirmationPhrase"
                className="block text-sm font-medium text-stone-800"
              >
                {t.deleteConfirmationLabel}
              </label>
              <input
                id="deleteConfirmationPhrase"
                name="deleteConfirmationPhrase"
                type="text"
                value={deleteConfirmationPhrase}
                onChange={(event) =>
                  setDeleteConfirmationPhrase(event.target.value)
                }
                placeholder={t.deleteConfirmationPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(deleteErrors.confirmationPhrase)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-stone-900 outline-none transition-colors focus:border-red-400"
              />
              <p className="text-xs text-stone-600">
                {t.deleteConfirmationHint}
              </p>
              {deleteErrors.confirmationPhrase ? (
                <p className="text-sm text-red-700">
                  {deleteErrors.confirmationPhrase}
                </p>
              ) : null}
            </div>

            {deleteErrors.form ? (
              <p className="text-sm text-red-700">{deleteErrors.form}</p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canDeleteAccount || isDeleting}
                className="inline-flex items-center justify-center rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? t.deletingAccount : t.deleteAccount}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
