/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSettingsClient from "./AccountSettingsClient";

const translations = {
  description: "Update your profile details and review account information.",
  profileCardTitle: "Profile details",
  profileCardBody:
    "Manage your display name and review your current account email.",
  avatarCardTitle: "Avatar",
  avatarCardBody:
    "Upload a new profile photo with explicit confirmation before applying changes.",
  displayNameLabel: "Display name",
  emailLabel: "Email",
  emailReadonlyHint:
    "Your current email remains active until a new email is verified.",
  editDisplayName: "Edit",
  editEmail: "Change",
  dialogTitle: "Edit display name",
  dialogBody: "Update your display name and confirm with Save.",
  displayNamePlaceholder: "Enter your display name",
  emailDialogTitle: "Change account email",
  emailDialogBody: "Enter your new email and confirm with Save.",
  newEmailLabel: "New email",
  newEmailPlaceholder: "name@example.com",
  pendingEmailTitle: "Pending email change",
  pendingEmailBody:
    "Verification email sent to {email}. Your current email remains active until verification succeeds.",
  pendingEmailResend: "Resend verification",
  pendingEmailResending: "Resending...",
  emailChangeRequested: "Verification email sent.",
  emailChangeResent: "Verification email sent again.",
  selectAvatar: "Choose avatar",
  avatarConstraints: "JPEG, PNG, or WebP up to 5 MB",
  avatarSelected: "Selected file",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving...",
  avatarSave: "Save avatar",
  avatarSaving: "Saving avatar...",
  errors: {
    ERR_INVALID_DISPLAY_NAME: "Display name is required",
    ERR_INVALID_EMAIL: "Enter a valid email address",
    ERR_EMAIL_UNCHANGED: "Enter a different email address",
    ERR_EMAIL_IN_USE: "This email is already used by another account",
    ERR_PENDING_EMAIL_CHANGE_NOT_FOUND: "No pending email change found",
    ERR_IMAGE_TOO_LARGE: "Image must be 5 MB or smaller",
    ERR_UNSUPPORTED_IMAGE_TYPE: "Only JPEG, PNG, and WebP are allowed",
    ERR_AVATAR_REQUIRED: "Please choose an image before saving",
    ERR_UNAUTHORIZED: "Please sign in again and try once more",
    ERR_INTERNAL: "Unable to save changes right now. Please try again.",
    generic: "Unable to save changes right now. Please try again.",
  },
};

const baseProfile = {
  id: "u1",
  displayName: "Alex",
  email: "alex@example.com",
  avatarUrl: null,
  pendingEmailChange: null,
};

describe("AccountSettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress background profile refresh by default
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe("display name dialog", () => {
    it("opens dialog, saves display name, and updates profile on success", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url === "/api/account" && fetchMock.mock.calls.length === 1) {
          // First call is background refresh — fail silently
          return Promise.resolve({
            ok: false,
            json: vi.fn().mockResolvedValue({}),
          });
        }

        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            profile: { ...baseProfile, displayName: "Alex Updated" },
          }),
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={baseProfile}
          t={translations}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Edit" }));

      const input = screen.getByPlaceholderText("Enter your display name");
      await user.clear(input);
      await user.type(input, "Alex Updated");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: "Alex Updated" }),
        });
      });

      // Dialog closes on success
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Enter your display name"),
        ).toBeNull();
      });
    });

    it("shows validation error when display name is empty", async () => {
      const user = userEvent.setup();

      render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={baseProfile}
          t={translations}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Edit" }));

      const input = screen.getByPlaceholderText("Enter your display name");
      await user.clear(input);
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        await screen.findByText("Display name is required"),
      ).not.toBeNull();
    });
  });

  describe("email change dialog", () => {
    it("submits email change and shows confirmation message", async () => {
      const user = userEvent.setup();
      const fetchMock = vi
        .fn()
        .mockImplementation((url: string, options?: RequestInit) => {
          if (
            (options as RequestInit | undefined)?.method === "PATCH" ||
            url === "/api/account"
          ) {
            return Promise.resolve({
              ok: false,
              json: vi.fn().mockResolvedValue({}),
            });
          }

          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              pendingEmailChange: {
                email: "new@example.com",
                expiresAt: "2026-05-21T00:00:00.000Z",
              },
            }),
          });
        });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={baseProfile}
          t={translations}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Change" }));

      const input = screen.getByPlaceholderText("name@example.com");
      await user.type(input, "new@example.com");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/account/email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "new@example.com", locale: "en" }),
        });
      });

      expect(
        await screen.findByText("Verification email sent."),
      ).not.toBeNull();
      // Dialog closes after success
      expect(screen.queryByPlaceholderText("name@example.com")).toBeNull();
    });
  });

  describe("avatar upload", () => {
    it("saves avatar and updates profile on success", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url === "/api/account") {
          return Promise.resolve({
            ok: false,
            json: vi.fn().mockResolvedValue({}),
          });
        }

        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({
            profile: {
              ...baseProfile,
              avatarUrl: "https://s3.example.com/users/u1/avatar.webp",
            },
          }),
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const file = new File(["avatar"], "avatar.png", { type: "image/png" });
      const { container } = render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={baseProfile}
          t={translations}
        />,
      );

      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      await user.upload(input, file);

      expect(screen.getByText(/Selected file/)).not.toBeNull();

      await user.click(screen.getByRole("button", { name: "Save avatar" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/account/avatar",
          expect.objectContaining({ method: "PATCH" }),
        );
      });
    });

    it("shows error when avatar file is too large", async () => {
      const user = userEvent.setup();

      const oversizedFile = new File(
        [new Uint8Array(6 * 1024 * 1024)],
        "big.png",
        { type: "image/png" },
      );
      const { container } = render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={baseProfile}
          t={translations}
        />,
      );

      const input = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      await user.upload(input, oversizedFile);

      expect(screen.getByText("Image must be 5 MB or smaller")).not.toBeNull();
    });
  });

  describe("pending email resend", () => {
    it("shows pending banner and resends verification on click", async () => {
      const user = userEvent.setup();
      const fetchMock = vi
        .fn()
        .mockImplementation((url: string, options?: RequestInit) => {
          if (
            url === "/api/account" &&
            (options as RequestInit | undefined)?.method !== "PATCH"
          ) {
            // Background GET refresh
            return Promise.resolve({
              ok: false,
              json: vi.fn().mockResolvedValue({}),
            });
          }

          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({
              pendingEmailChange: {
                email: "new@example.com",
                expiresAt: "2026-05-22T00:00:00.000Z",
              },
            }),
          });
        });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AccountSettingsClient
          title="Account"
          lang="en"
          initialProfile={{
            ...baseProfile,
            pendingEmailChange: {
              email: "new@example.com",
              expiresAt: "2026-05-21T00:00:00.000Z",
            },
          }}
          t={translations}
        />,
      );

      expect(screen.getByText("Pending email change")).not.toBeNull();

      await user.click(
        screen.getByRole("button", { name: "Resend verification" }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/account/email-change", {
          method: "PATCH",
        });
      });

      expect(
        await screen.findByText("Verification email sent again."),
      ).not.toBeNull();
    });
  });
});
