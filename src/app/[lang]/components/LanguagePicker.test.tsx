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

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /language/i }));
}

describe("LanguagePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/en/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("closed state", () => {
    it("shows the active language label on the trigger", () => {
      render(<LanguagePicker currentLang="en" />);

      const trigger = screen.getByRole("button", { name: /language/i });
      expect(trigger.textContent).toContain("English");
    });

    it("does not render the option list when closed", () => {
      render(<LanguagePicker currentLang="en" />);

      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  describe("open state", () => {
    it("opens the listbox when the trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);

      expect(screen.getByRole("listbox")).not.toBeNull();
    });

    it("shows all three language options labeled with their self-names", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);

      expect(screen.getByRole("option", { name: "English" })).not.toBeNull();
      expect(screen.getByRole("option", { name: "Español" })).not.toBeNull();
      expect(screen.getByRole("option", { name: "Русский" })).not.toBeNull();
    });

    it("marks the active locale as selected", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="es" />);

      await openDropdown(user);

      expect(
        screen.getByRole("option", { name: "Español" }).getAttribute("aria-selected"),
      ).toBe("true");
      expect(
        screen.getByRole("option", { name: "English" }).getAttribute("aria-selected"),
      ).toBe("false");
    });

    it("closes the listbox when the trigger is clicked again", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);
      await user.click(screen.getByRole("button", { name: /language/i }));

      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  describe("unauthenticated locale switching", () => {
    it("navigates to the Spanish-prefixed route preserving the path", async () => {
      pathnameMock.mockReturnValue("/en/settings/language");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);
      await user.click(screen.getByRole("option", { name: "Español" }));

      expect(pushMock).toHaveBeenCalledWith("/es/settings/language");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("navigates to the Russian-prefixed route preserving the path", async () => {
      pathnameMock.mockReturnValue("/en/dashboard");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);
      await user.click(screen.getByRole("option", { name: "Русский" }));

      expect(pushMock).toHaveBeenCalledWith("/ru/dashboard");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("authenticated locale switching", () => {
    it("persists locale then navigates on success", async () => {
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

      await openDropdown(user);
      await user.click(screen.getByRole("option", { name: "Español" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/account/locale", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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

      await openDropdown(user);
      await user.click(screen.getByRole("option", { name: "Español" }));

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

      await openDropdown(user);
      await user.click(screen.getByRole("option", { name: "Español" }));

      expect((await screen.findByRole("alert")).textContent).toContain(
        "Unable to save preference",
      );
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  describe("keyboard navigation", () => {
    it("opens the listbox with Enter on the trigger", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard("{Enter}");

      expect(screen.getByRole("listbox")).not.toBeNull();
    });

    it("opens the listbox with Space on the trigger", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard(" ");

      expect(screen.getByRole("listbox")).not.toBeNull();
    });

    it("opens the listbox and focuses the active option with ArrowDown", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="es" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard("{ArrowDown}");

      expect(screen.getByRole("listbox")).not.toBeNull();
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "Español" }),
        );
      });
    });

    it("closes the listbox with Escape and returns focus to trigger", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      await openDropdown(user);
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: /language/i }),
      );
    });

    it("navigates options with ArrowDown and ArrowUp", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "English" }),
        );
      });

      await user.keyboard("{ArrowDown}");
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "Español" }),
        );
      });

      await user.keyboard("{ArrowUp}");
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "English" }),
        );
      });
    });

    it("navigates to first option with Home and last with End", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="ru" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "Русский" }),
        );
      });

      await user.keyboard("{Home}");
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "English" }),
        );
      });

      await user.keyboard("{End}");
      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "Русский" }),
        );
      });
    });

    it("closes and returns focus to trigger when ArrowUp is pressed on the first option", async () => {
      const user = userEvent.setup();
      render(<LanguagePicker currentLang="en" />);

      screen.getByRole("button", { name: /language/i }).focus();
      await user.keyboard("{ArrowDown}");

      await waitFor(() => {
        expect(document.activeElement).toBe(
          screen.getByRole("option", { name: "English" }),
        );
      });

      await user.keyboard("{ArrowUp}");

      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: /language/i }),
      );
    });
  });
});
