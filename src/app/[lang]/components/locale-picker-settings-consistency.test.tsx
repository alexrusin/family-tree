/** @vitest-environment jsdom */

/**
 * Consistency tests verifying that the authenticated Language Picker and the
 * Language Section in User Settings follow the same Preferred Locale rules:
 * both call the same API endpoint with the same request shape, both navigate
 * to locale-prefixed routes after a successful save, and both surface
 * localized errors on failure without changing the current route.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguagePicker from "./LanguagePicker";
import LanguageSettingsClient from "../settings/language/LanguageSettingsClient";

const { pushMock, refreshMock, pathnameMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => pathnameMock(),
}));

const errorMessages = {
  ERR_INVALID_LOCALE: "Choose a supported language",
  ERR_UNAUTHORIZED: "Please sign in again",
  ERR_USER_NOT_FOUND: "Account not found",
  ERR_UPDATE_FAILED: "Unable to save preference",
  ERR_INTERNAL: "Unable to save preference",
  generic: "Unable to save preference",
};

const settingsTranslations = {
  description: "Choose your preferred language.",
  cardTitle: "System language",
  cardBody: "Select the language used across the app.",
  selectLabel: "Preferred language",
  selectHelp: "Changing language reloads the app.",
  optionEnglish: "English",
  optionSpanish: "Español",
  optionRussian: "Russian",
  discard: "Discard changes",
  save: "Save preferences",
  saving: "Saving preferences...",
  errors: errorMessages,
};

const LOCALE_API_CALL = {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ locale: "es" }),
};

describe("authenticated Language Picker and Language Section consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/en/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("shared locale persistence API contract", () => {
    it("authenticated Language Picker sends Spanish locale to PATCH /api/account/locale", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ locale: "es" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const user = userEvent.setup();
      render(
        <LanguagePicker
          currentLang="en"
          persistLocalePreference
          errorMessages={errorMessages}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Español" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/account/locale",
          LOCALE_API_CALL,
        );
      });
    });

    it("Language Settings sends Spanish locale to PATCH /api/account/locale", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ locale: "es" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const user = userEvent.setup();
      render(
        <LanguageSettingsClient
          title="Language"
          lang="en"
          initialLocale="en"
          t={settingsTranslations}
        />,
      );

      await user.selectOptions(
        screen.getByLabelText("Preferred language"),
        "es",
      );
      await user.click(screen.getByRole("button", { name: "Save preferences" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/account/locale",
          LOCALE_API_CALL,
        );
      });
    });
  });

  describe("route updates after successful locale persistence", () => {
    it("authenticated Language Picker navigates to the Spanish-prefixed current route on success", async () => {
      pathnameMock.mockReturnValue("/en/dashboard");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ locale: "es" }),
        }),
      );

      const user = userEvent.setup();
      render(
        <LanguagePicker
          currentLang="en"
          persistLocalePreference
          errorMessages={errorMessages}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Español" }));

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/es/dashboard");
      });
    });

    it("Language Settings navigates to the Spanish-prefixed settings route on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ locale: "es" }),
        }),
      );

      const user = userEvent.setup();
      render(
        <LanguageSettingsClient
          title="Language"
          lang="en"
          initialLocale="en"
          t={settingsTranslations}
        />,
      );

      await user.selectOptions(
        screen.getByLabelText("Preferred language"),
        "es",
      );
      await user.click(screen.getByRole("button", { name: "Save preferences" }));

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/es/settings/language");
      });
    });
  });

  describe("error handling — route and saved locale stay in sync", () => {
    it("authenticated Language Picker surfaces localized error and does not navigate on API failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({ errorCode: "ERR_UPDATE_FAILED" }),
        }),
      );

      const user = userEvent.setup();
      render(
        <LanguagePicker
          currentLang="en"
          persistLocalePreference
          errorMessages={errorMessages}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Español" }));

      expect(await screen.findByRole("alert")).not.toBeNull();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("Language Settings surfaces localized error and does not navigate on API failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({ errorCode: "ERR_UPDATE_FAILED" }),
        }),
      );

      const user = userEvent.setup();
      render(
        <LanguageSettingsClient
          title="Language"
          lang="en"
          initialLocale="en"
          t={settingsTranslations}
        />,
      );

      await user.selectOptions(
        screen.getByLabelText("Preferred language"),
        "es",
      );
      await user.click(screen.getByRole("button", { name: "Save preferences" }));

      expect(
        await screen.findByText("Unable to save preference"),
      ).not.toBeNull();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  describe("unauthenticated behavior is unaffected", () => {
    it("unauthenticated Language Picker updates the route without calling the locale API", async () => {
      pathnameMock.mockReturnValue("/en/dashboard");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await user.click(screen.getByRole("button", { name: "Español" }));

      expect(pushMock).toHaveBeenCalledWith("/es/dashboard");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
