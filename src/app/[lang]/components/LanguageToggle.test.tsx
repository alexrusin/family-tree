/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageToggle from "./LanguageToggle";

const { pushMock, pathnameMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  pathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => pathnameMock(),
}));

const localizedErrors = {
  ERR_INVALID_LOCALE: "Choose a supported language",
  ERR_UNAUTHORIZED: "Please sign in again",
  ERR_USER_NOT_FOUND: "Account not found",
  ERR_UPDATE_FAILED: "Unable to save preference",
  ERR_INTERNAL: "Unable to save preference",
  generic: "Unable to save preference",
};

describe("LanguageToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/en/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("switches route prefix only for non-persisted toggle usage", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<LanguageToggle label="Русский" currentLang="en" />);

    await user.click(screen.getByRole("button", { name: "Switch language" }));

    expect(pushMock).toHaveBeenCalledWith("/ru/dashboard");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists locale then navigates for authenticated toggle usage", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ locale: "ru" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageToggle
        label="Русский"
        currentLang="en"
        persistLocalePreference
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Switch language" }));

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
      expect(pushMock).toHaveBeenCalledWith("/ru/dashboard");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows localized error and does not navigate when locale persistence fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorCode: "ERR_UPDATE_FAILED" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageToggle
        label="Русский"
        currentLang="en"
        persistLocalePreference
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Switch language" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to save preference",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows generic localized error when persistence throws", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LanguageToggle
        label="Русский"
        currentLang="en"
        persistLocalePreference
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Switch language" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to save preference",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
