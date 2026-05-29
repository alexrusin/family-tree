import { describe, expect, it } from "vitest";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  meetsPasswordPolicy,
  validateChangePasswordInput,
  validateDeleteAccountInput,
} from "./security-form-state";

describe("security form state", () => {
  it("validates password policy for strong passwords", () => {
    expect(meetsPasswordPolicy("Family123")).toBe(true);
    expect(meetsPasswordPolicy("password!")).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(meetsPasswordPolicy("short")).toBe(false);
    expect(meetsPasswordPolicy("longpassword")).toBe(false);
  });

  it("requires current password", () => {
    const errors = validateChangePasswordInput({
      currentPassword: " ",
      newPassword: "Family123",
      confirmPassword: "Family123",
    });

    expect(errors.currentPassword).toBe("ERR_CURRENT_PASSWORD_REQUIRED");
  });

  it("requires confirmation to match new password", () => {
    const errors = validateChangePasswordInput({
      currentPassword: "old-pass",
      newPassword: "Family123",
      confirmPassword: "Family456",
    });

    expect(errors.confirmPassword).toBe("ERR_PASSWORD_MISMATCH");
  });

  it("returns no errors for valid payload", () => {
    const errors = validateChangePasswordInput({
      currentPassword: "old-pass",
      newPassword: "Family123",
      confirmPassword: "Family123",
    });

    expect(errors).toEqual({});
  });

  it("requires current password for account deletion", () => {
    const errors = validateDeleteAccountInput({
      currentPassword: "  ",
      confirmationPhrase: DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    });

    expect(errors.currentPassword).toBe("ERR_CURRENT_PASSWORD_REQUIRED");
  });

  it("requires deletion confirmation phrase", () => {
    const errors = validateDeleteAccountInput({
      currentPassword: "password123",
      confirmationPhrase: "",
    });

    expect(errors.confirmationPhrase).toBe("ERR_DELETE_CONFIRMATION_REQUIRED");
  });

  it("rejects mismatched deletion confirmation phrase", () => {
    const errors = validateDeleteAccountInput({
      currentPassword: "password123",
      confirmationPhrase: "delete",
    });

    expect(errors.confirmationPhrase).toBe("ERR_DELETE_CONFIRMATION_MISMATCH");
  });

  it("returns no account deletion errors for valid payload", () => {
    const errors = validateDeleteAccountInput({
      currentPassword: "password123",
      confirmationPhrase: DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    });

    expect(errors).toEqual({});
  });
});
