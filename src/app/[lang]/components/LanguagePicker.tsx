"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const currentLocale: Locale =
    toLocale(currentLang) ?? LOCALES[0];
  const currentIndex = LOCALES.indexOf(currentLocale);

  // Close on pointer-down outside the widget
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Move DOM focus to the focused option when the index changes while open
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  function open() {
    setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    setIsOpen(true);
  }

  function close(returnFocus = true) {
    setIsOpen(false);
    setFocusedIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  }

  async function handleSelect(targetLang: Locale) {
    close(false);
    triggerRef.current?.focus();

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

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        open();
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;
    }
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLLIElement>,
    locale: Locale,
    index: number,
  ) {
    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        void handleSelect(locale);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (index < LOCALES.length - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        } else {
          close();
        }
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(LOCALES.length - 1);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <div className="relative flex flex-col items-end" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        disabled={isSaving}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language: ${LOCALE_LABELS[currentLocale]}`}
        className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {LOCALE_LABELS[currentLocale]}
        <svg
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-1 min-w-max rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {LOCALES.map((locale, index) => {
            const isActive = locale === currentLocale;
            return (
              <li
                key={locale}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isActive}
                tabIndex={index === focusedIndex ? 0 : -1}
                onClick={() => void handleSelect(locale)}
                onKeyDown={(e) => handleOptionKeyDown(e, locale, index)}
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-amber-50 font-semibold text-amber-900"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                {isActive ? (
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-amber-800"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                {LOCALE_LABELS[locale]}
              </li>
            );
          })}
        </ul>
      ) : null}

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
