"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type SupportedLocale = "en" | "ru";

interface LanguageToggleErrorMessages {
  ERR_INVALID_LOCALE: string;
  ERR_UNAUTHORIZED: string;
  ERR_USER_NOT_FOUND: string;
  ERR_UPDATE_FAILED: string;
  ERR_INTERNAL: string;
  generic: string;
  [key: string]: string;
}

interface LanguageToggleProps {
  label: string;
  currentLang: string;
  persistLocalePreference?: boolean;
  errorMessages?: LanguageToggleErrorMessages;
}

function toSupportedLocale(value: unknown): SupportedLocale | null {
  if (value === "en" || value === "ru") {
    return value;
  }

  return null;
}

function mapErrorCode(
  errorCode: string | null | undefined,
  errorMessages?: LanguageToggleErrorMessages,
): string {
  if (errorCode && errorMessages && errorCode in errorMessages) {
    return errorMessages[errorCode];
  }

  return (
    errorMessages?.generic ??
    "Unable to save language preference right now. Please try again."
  );
}

function getLocalizedPath(
  pathname: string,
  currentLang: string,
  targetLang: SupportedLocale,
): string {
  if (pathname === `/${currentLang}`) {
    return `/${targetLang}`;
  }

  if (pathname.startsWith(`/${currentLang}/`)) {
    return pathname.replace(`/${currentLang}/`, `/${targetLang}/`);
  }

  return `/${targetLang}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export default function LanguageToggle({
  label,
  currentLang,
  persistLocalePreference = false,
  errorMessages,
}: LanguageToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleToggle() {
    const targetLang = currentLang === "en" ? "ru" : "en";
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

      const updatedLocale = toSupportedLocale(payload?.locale);

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
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors text-amber-900 text-sm font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Switch language"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
        </svg>
        {label}
      </button>

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
