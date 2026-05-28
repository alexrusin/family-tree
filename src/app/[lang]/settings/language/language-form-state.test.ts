import { describe, expect, it } from "vitest";
import {
  toSupportedLocale,
  validateLanguagePreference,
} from "./language-form-state";

describe("language form state", () => {
  it("accepts en, es, and ru locales", () => {
    expect(toSupportedLocale("en")).toBe("en");
    expect(toSupportedLocale("es")).toBe("es");
    expect(toSupportedLocale("ru")).toBe("ru");
  });

  it("rejects unsupported locales", () => {
    expect(toSupportedLocale("de")).toBeNull();
    expect(toSupportedLocale(123)).toBeNull();
  });

  it("returns validation error for unsupported locale", () => {
    expect(validateLanguagePreference("de")).toBe("ERR_INVALID_LOCALE");
  });

  it("passes validation for supported locale", () => {
    expect(validateLanguagePreference("en")).toBeNull();
    expect(validateLanguagePreference("es")).toBeNull();
    expect(validateLanguagePreference("ru")).toBeNull();
  });
});
