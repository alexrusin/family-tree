/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SecuritySettingsClient from "./SecuritySettingsClient";
import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from "./security-form-state";

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

const translations = {
  description: "Manage account security and danger-zone actions.",
  changePasswordTitle: "Change password",
  changePasswordBody: "Update your password to keep your account secure.",
  currentPasswordLabel: "Current password (change)",
  currentPasswordPlaceholder: "Enter current password",
  newPasswordLabel: "New password",
  newPasswordPlaceholder: "Enter new password",
  confirmPasswordLabel: "Confirm new password",
  confirmPasswordPlaceholder: "Repeat new password",
  passwordHint: "Use at least 8 characters and include a number or symbol.",
  save: "Save",
  saving: "Saving...",
  successMessage: "Password updated successfully",
  dangerZoneTitle: "Danger zone",
  dangerZoneBody: "Deleting your account removes your access permanently.",
  deleteCurrentPasswordLabel: "Current password (delete)",
  deleteCurrentPasswordPlaceholder: "Enter current password",
  deleteConfirmationLabel: "Type confirmation",
  deleteConfirmationPlaceholder: "Type DELETE",
  deleteConfirmationHint: "Type DELETE exactly to unlock account deletion.",
  deleteImpactOwnedTrees: "Your owned trees are deleted.",
  deleteImpactCollaboratorAccess: "Collaborator access is removed.",
  deleteImpactOtherOwners: "Shared trees remain with other owners.",
  deleteAccount: "Delete account",
  deletingAccount: "Deleting account...",
  errors: {
    ERR_CURRENT_PASSWORD_REQUIRED: "Current password is required",
    ERR_NEW_PASSWORD_REQUIRED: "New password is required",
    ERR_CONFIRM_PASSWORD_REQUIRED: "Confirm your new password",
    ERR_PASSWORD_MISMATCH: "Passwords do not match",
    ERR_WEAK_PASSWORD: "Password is too weak",
    ERR_INVALID_CURRENT_PASSWORD: "Current password is incorrect",
    ERR_DELETE_CONFIRMATION_REQUIRED: "Deletion confirmation is required",
    ERR_DELETE_CONFIRMATION_MISMATCH: "Deletion confirmation must be DELETE",
    ERR_ACCOUNT_DELETE_FAILED: "Unable to delete account",
    ERR_UNAUTHORIZED: "Please sign in again",
    ERR_INTERNAL: "Something went wrong",
    generic: "Something went wrong",
  },
};

describe("SecuritySettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits password change and shows success state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SecuritySettingsClient title="Security" lang="en" t={translations} />,
    );

    await user.type(
      screen.getByLabelText("Current password (change)"),
      "old-password",
    );
    await user.type(screen.getByLabelText("New password"), "Family123");
    await user.type(screen.getByLabelText("Confirm new password"), "Family123");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "Family123",
        }),
      });
    });

    expect(
      await screen.findByText("Password updated successfully"),
    ).not.toBeNull();
    expect(
      (screen.getByLabelText("Current password (change)") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByLabelText("New password") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Confirm new password") as HTMLInputElement).value,
    ).toBe("");
  });

  it("requires dual confirmation before enabling account deletion", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SecuritySettingsClient title="Security" lang="en" t={translations} />,
    );

    const deleteButton = screen.getByRole("button", { name: "Delete account" });
    const deletePassword = screen.getByLabelText("Current password (delete)");
    const deleteConfirmation = screen.getByLabelText("Type confirmation");

    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);

    await user.type(deletePassword, "password123");
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);

    await user.type(deleteConfirmation, "delete");
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);

    await user.clear(deleteConfirmation);
    await user.type(deleteConfirmation, DELETE_ACCOUNT_CONFIRMATION_PHRASE);
    expect((deleteButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(deleteButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "password123",
          confirmationPhrase: "DELETE",
        }),
      });
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/en/login");
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
