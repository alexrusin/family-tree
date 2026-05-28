/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguagePicker from "./LanguagePicker";

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

describe("LanguagePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/en/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows all three language options labeled with their self-names", () => {
    render(<LanguagePicker currentLang="en" />);

    expect(screen.getByRole("button", { name: "English" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Español" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Русский" })).not.toBeNull();
  });

  it("navigates to the Spanish-prefixed route preserving the path for unauthenticated switching", async () => {
    pathnameMock.mockReturnValue("/en/settings/language");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<LanguagePicker currentLang="en" />);

    await user.click(screen.getByRole("button", { name: "Español" }));

    expect(pushMock).toHaveBeenCalledWith("/es/settings/language");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("navigates to the Russian-prefixed route preserving the path for unauthenticated switching", async () => {
    pathnameMock.mockReturnValue("/en/dashboard");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<LanguagePicker currentLang="en" />);

    await user.click(screen.getByRole("button", { name: "Русский" }));

    expect(pushMock).toHaveBeenCalledWith("/ru/dashboard");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persists locale then navigates for authenticated locale switching", async () => {
    pathnameMock.mockReturnValue("/en/dashboard");
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
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Español" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/locale", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale: "es" }),
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/es/dashboard");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows localized error and does not navigate when locale persistence fails", async () => {
    pathnameMock.mockReturnValue("/en/dashboard");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ errorCode: "ERR_UPDATE_FAILED" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <LanguagePicker
        currentLang="en"
        persistLocalePreference
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Español" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to save preference",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows generic error and does not navigate when persistence throws", async () => {
    pathnameMock.mockReturnValue("/en/dashboard");
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <LanguagePicker
        currentLang="en"
        persistLocalePreference
        errorMessages={localizedErrors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Español" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to save preference",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
