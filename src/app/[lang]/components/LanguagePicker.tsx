"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { type Locale, LOCALES } from "@/lib/locale";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ru: "Русский",
};

interface LanguagePickerErrorMessages {
  ERR_INVALID_LOCALE: string;
  ERR_UNAUTHORIZED: string;
  ERR_USER_NOT_FOUND: string;
  ERR_UPDATE_FAILED: string;
  ERR_INTERNAL: string;
  generic: string;
  [key: string]: string;
}

interface LanguagePickerProps {
  currentLang: string;
  persistLocalePreference?: boolean;
  errorMessages?: LanguagePickerErrorMessages;
}

function getLocalizedPath(
  pathname: string,
  currentLang: string,
  targetLang: Locale,
): string {
  if (pathname === `/${currentLang}`) {
    return `/${targetLang}`;
  }

  if (pathname.startsWith(`/${currentLang}/`)) {
    return pathname.replace(`/${currentLang}/`, `/${targetLang}/`);
  }

  return `/${targetLang}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function toLocale(value: unknown): Locale | null {
  if (value === "en" || value === "es" || value === "ru") {
    return value;
  }

  return null;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errorMessages?: LanguagePickerErrorMessages,
): string {
  if (errorCode && errorMessages && errorCode in errorMessages) {
    return errorMessages[errorCode];
  }

  return (
    errorMessages?.generic ??
    "Unable to save language preference right now. Please try again."
  );
}

export default function LanguagePicker({
  currentLang,
  persistLocalePreference = false,
  errorMessages,
}: LanguagePickerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSelect(targetLang: Locale) {
    if (targetLang === currentLang || isSaving) return;

    const newPath = getLocalizedPath(pathname, currentLang, targetLang);

    if (!persistLocalePreference) {
      router.push(newPath);
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
        body: JSON.stringify({ locale: targetLang }),
      });

      const payload = (await response.json().catch(() => null)) as {
        locale?: unknown;
        errorCode?: string;
      } | null;

      const updatedLocale = toLocale(payload?.locale);

      if (!response.ok || !updatedLocale) {
        setActionError(mapErrorCode(payload?.errorCode, errorMessages));
        return;
      }

      const updatedPath = getLocalizedPath(
        pathname,
        currentLang,
        updatedLocale,
      );
      router.push(updatedPath);
    } catch {
      setActionError(mapErrorCode("generic", errorMessages));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <div
        className="flex rounded-full bg-stone-100 p-0.5"
        role="group"
        aria-label="Language"
      >
        {LOCALES.map((locale) => {
          const isActive = locale === currentLang;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              disabled={isSaving}
              aria-pressed={isActive}
              className={
                isActive
                  ? "px-3 py-1 rounded-full text-sm font-semibold bg-amber-900 text-white cursor-default"
                  : "px-3 py-1 rounded-full text-sm font-semibold text-amber-900 hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              }
            >
              {LOCALE_LABELS[locale]}
            </button>
          );
        })}
      </div>

      {actionError ? (
        <p
          className="mt-1 max-w-56 text-right text-xs text-red-700"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
