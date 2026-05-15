const SUPPORTED_LOCALES = new Set(["en", "ru"]);

export function resolvePostAuthRedirect(
  lang: string,
  rawCallback: string | null | undefined,
): string {
  const normalizedLang = lang.trim().toLowerCase();
  const fallback = `/${normalizedLang}/dashboard`;

  if (!rawCallback || typeof rawCallback !== "string") {
    return fallback;
  }

  const callback = rawCallback.trim();
  if (!callback || !callback.startsWith("/") || callback.startsWith("//")) {
    return fallback;
  }

  if (/\\|\r|\n/.test(callback)) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(callback, "http://localhost");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "http://localhost") {
    return fallback;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const callbackLocale = segments[0]?.toLowerCase();
  if (!callbackLocale || !SUPPORTED_LOCALES.has(callbackLocale)) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
