export type SupportedLocale = "en" | "es" | "ru";

export function toSupportedLocale(value: unknown): SupportedLocale | null {
  if (value === "en" || value === "es" || value === "ru") {
    return value;
  }

  return null;
}

export function validateLanguagePreference(value: unknown): string | null {
  return toSupportedLocale(value) ? null : "ERR_INVALID_LOCALE";
}
