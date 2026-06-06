import { DEFAULT_LOCALE, isLocale } from "@/lib/locale";

export const EMAIL_VERIFIED_PARAM = "emailVerified";

function normalizeLang(lang: string): string {
  const normalizedLang = lang.trim().toLowerCase();
  return isLocale(normalizedLang) ? normalizedLang : DEFAULT_LOCALE;
}

function getSafePostAuthRedirect(
  rawCallback: string | null | undefined,
): string | null {
  if (!rawCallback || typeof rawCallback !== "string") {
    return null;
  }

  const callback = rawCallback.trim();
  if (!callback || !callback.startsWith("/") || callback.startsWith("//")) {
    return null;
  }

  if (/\\|\r|\n/.test(callback)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(callback, "http://localhost");
  } catch {
    return null;
  }

  if (parsed.origin !== "http://localhost") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const callbackLocale = segments[0]?.toLowerCase();
  if (!callbackLocale || !isLocale(callbackLocale)) {
    return null;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolvePostAuthRedirect(
  lang: string,
  rawCallback: string | null | undefined,
): string {
  const normalizedLang = normalizeLang(lang);
  const fallback = `/${normalizedLang}/dashboard`;

  return getSafePostAuthRedirect(rawCallback) ?? fallback;
}

export function buildPostVerificationRedirect(
  lang: string,
): string {
  const fallback = new URL(
    resolvePostAuthRedirect(lang, null),
    "http://localhost",
  );
  fallback.searchParams.set(EMAIL_VERIFIED_PARAM, "1");

  return `${fallback.pathname}${fallback.search}${fallback.hash}`;
}
