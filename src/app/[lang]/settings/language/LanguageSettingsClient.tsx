"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type SupportedLocale,
  toSupportedLocale,
  validateLanguagePreference,
} from "./language-form-state";

interface LanguageTranslations {
  description: string;
  cardTitle: string;
  cardBody: string;
  selectLabel: string;
  selectHelp: string;
  optionEnglish: string;
  optionSpanish: string;
  optionRussian: string;
  discard: string;
  save: string;
  saving: string;
  errors: {
    ERR_INVALID_LOCALE: string;
    ERR_UNAUTHORIZED: string;
    ERR_USER_NOT_FOUND: string;
    ERR_UPDATE_FAILED: string;
    ERR_INTERNAL: string;
    generic: string;
    [key: string]: string;
  };
}

interface LanguageSettingsClientProps {
  title: string;
  lang: string;
  initialLocale: SupportedLocale;
  t: LanguageTranslations;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errors: LanguageTranslations["errors"],
): string {
  if (errorCode && errorCode in errors) {
    return errors[errorCode];
  }

  return errors.generic;
}

export default function LanguageSettingsClient({
  title,
  lang,
  initialLocale,
  t,
}: LanguageSettingsClientProps) {
  const router = useRouter();
  const [savedLocale, setSavedLocale] =
    useState<SupportedLocale>(initialLocale);
  const [localeDraft, setLocaleDraft] =
    useState<SupportedLocale>(initialLocale);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = localeDraft !== savedLocale;

  const localeOptions = useMemo(
    () => [
      { value: "en" as const, label: t.optionEnglish },
      { value: "es" as const, label: t.optionSpanish },
      { value: "ru" as const, label: t.optionRussian },
    ],
    [t.optionEnglish, t.optionSpanish, t.optionRussian],
  );

  const discardChanges = () => {
    if (isSaving) {
      return;
    }

    setLocaleDraft(savedLocale);
    setActionError(null);
  };

  const saveChanges = async () => {
    const validationError = validateLanguagePreference(localeDraft);
    if (validationError) {
      setActionError(mapErrorCode(validationError, t.errors));
      return;
    }

    setIsSaving(true);
    setActionError(null);

    try {
      const response = await fetch("/api/account/locale", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale: localeDraft }),
      });

      const payload = (await response.json().catch(() => null)) as {
        locale?: unknown;
        errorCode?: string;
      } | null;

      const updatedLocale = toSupportedLocale(payload?.locale);
      if (!response.ok || !updatedLocale) {
        setActionError(mapErrorCode(payload?.errorCode, t.errors));
        return;
      }

      setSavedLocale(updatedLocale);
      setLocaleDraft(updatedLocale);
      router.push(`/${updatedLocale}/settings/language`);
      if (updatedLocale === lang) {
        router.refresh();
      }
    } catch {
      setActionError(t.errors.generic);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {t.description}
      </p>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-800">
            Aa
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              {t.cardTitle}
            </h3>
            <p className="mt-1 text-sm text-stone-600 sm:text-base">
              {t.cardBody}
            </p>
          </div>
        </div>

        <div className="mt-8 max-w-xl">
          <label
            htmlFor="locale"
            className="mb-2 block text-sm font-medium text-stone-900 sm:text-base"
          >
            {t.selectLabel}
          </label>
          <select
            id="locale"
            name="locale"
            value={localeDraft}
            onChange={(event) => {
              const nextLocale = toSupportedLocale(event.target.value);
              if (nextLocale) {
                setLocaleDraft(nextLocale);
                setActionError(null);
              }
            }}
            className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-amber-400"
            aria-invalid={Boolean(actionError)}
          >
            {localeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm italic text-stone-500">{t.selectHelp}</p>
          {actionError ? (
            <p className="mt-2 text-sm text-red-700">{actionError}</p>
          ) : null}
        </div>
      </section>

      <div className="mt-8 border-t border-stone-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={discardChanges}
            disabled={!hasChanges || isSaving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.discard}
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={!hasChanges || isSaving}
            className="rounded-xl bg-amber-800 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
