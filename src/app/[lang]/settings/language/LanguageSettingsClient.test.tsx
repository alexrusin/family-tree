/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSettingsClient from "./LanguageSettingsClient";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const translations = {
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
  errors: {
    ERR_INVALID_LOCALE: "Choose a supported language",
    ERR_UNAUTHORIZED: "Please sign in again",
    ERR_USER_NOT_FOUND: "Account not found",
    ERR_UPDATE_FAILED: "Unable to save preference",
    ERR_INTERNAL: "Unable to save preference",
    generic: "Unable to save preference",
  },
};

describe("LanguageSettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("saves changed locale and navigates to selected locale settings route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ locale: "ru" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    const select = screen.getByLabelText("Preferred language");
    const saveButton = screen.getByRole("button", { name: "Save preferences" });
    const discardButton = screen.getByRole("button", {
      name: "Discard changes",
    });

    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    expect((discardButton as HTMLButtonElement).disabled).toBe(true);

    await user.selectOptions(select, "ru");

    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
    expect((discardButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/locale", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale: "ru" }),
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/ru/settings/language");
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("discards draft changes back to the persisted locale", async () => {
    const user = userEvent.setup();

    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    const select = screen.getByLabelText(
      "Preferred language",
    ) as HTMLSelectElement;
    const saveButton = screen.getByRole("button", { name: "Save preferences" });
    const discardButton = screen.getByRole("button", {
      name: "Discard changes",
    });

    await user.selectOptions(select, "ru");
    expect(select.value).toBe("ru");

    await user.click(discardButton);

    expect(select.value).toBe("en");
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    expect((discardButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows localized error when API update fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorCode: "ERR_UPDATE_FAILED" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Preferred language"), "ru");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(await screen.findByText("Unable to save preference")).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("refreshes page when saved locale matches current route locale", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ locale: "ru" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageSettingsClient
        title="Language"
        lang="ru"
        initialLocale="en"
        t={translations}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Preferred language"), "ru");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/ru/settings/language");
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("selector displays English, Español, and Русский options", () => {
    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    const select = screen.getByLabelText(
      "Preferred language",
    ) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    const optionLabels = Array.from(select.options).map((o) => o.text);

    expect(optionValues).toContain("en");
    expect(optionValues).toContain("es");
    expect(optionValues).toContain("ru");
    expect(optionLabels).toContain("English");
    expect(optionLabels).toContain("Español");
    expect(optionLabels).toContain("Russian");
  });

  it("reflects the initial Spanish locale when user has es preference", () => {
    render(
      <LanguageSettingsClient
        title="Language"
        lang="es"
        initialLocale="es"
        t={translations}
      />,
    );

    const select = screen.getByLabelText(
      "Preferred language",
    ) as HTMLSelectElement;
    expect(select.value).toBe("es");
  });

  it("saves Spanish locale and navigates to /es/settings/language", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ locale: "es" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Preferred language"),
      "es",
    );
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "es" }),
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/es/settings/language");
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("discards draft Spanish selection back to the persisted locale", async () => {
    const user = userEvent.setup();

    render(
      <LanguageSettingsClient
        title="Language"
        lang="en"
        initialLocale="en"
        t={translations}
      />,
    );

    const select = screen.getByLabelText(
      "Preferred language",
    ) as HTMLSelectElement;
    const discardButton = screen.getByRole("button", {
      name: "Discard changes",
    });

    await user.selectOptions(select, "es");
    expect(select.value).toBe("es");

    await user.click(discardButton);

    expect(select.value).toBe("en");
  });

  it("shows localized error when Spanish save fails with a known error code", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorCode: "ERR_UNAUTHORIZED" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageSettingsClient
        title="Language"
        lang="es"
        initialLocale="es"
        t={translations}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText("Preferred language"),
      "ru",
    );
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(await screen.findByText("Please sign in again")).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
