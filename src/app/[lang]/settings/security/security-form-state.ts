import { meetsPasswordPolicy } from "@/lib/password-policy";

export { meetsPasswordPolicy };

export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE";

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface DeleteAccountInput {
  currentPassword: string;
  confirmationPhrase: string;
}

export interface DeleteAccountValidationErrors {
  currentPassword?: string;
  confirmationPhrase?: string;
}

export function validateChangePasswordInput(
  input: ChangePasswordInput,
): ChangePasswordValidationErrors {
  const errors: ChangePasswordValidationErrors = {};

  if (input.currentPassword.trim().length === 0) {
    errors.currentPassword = "ERR_CURRENT_PASSWORD_REQUIRED";
  }

  if (input.newPassword.length === 0) {
    errors.newPassword = "ERR_NEW_PASSWORD_REQUIRED";
  } else if (!meetsPasswordPolicy(input.newPassword)) {
    errors.newPassword = "ERR_WEAK_PASSWORD";
  }

  if (input.confirmPassword.length === 0) {
    errors.confirmPassword = "ERR_CONFIRM_PASSWORD_REQUIRED";
  } else if (input.confirmPassword !== input.newPassword) {
    errors.confirmPassword = "ERR_PASSWORD_MISMATCH";
  }

  return errors;
}

export function validateDeleteAccountInput(
  input: DeleteAccountInput,
): DeleteAccountValidationErrors {
  const errors: DeleteAccountValidationErrors = {};

  if (input.currentPassword.trim().length === 0) {
    errors.currentPassword = "ERR_CURRENT_PASSWORD_REQUIRED";
  }

  if (input.confirmationPhrase.length === 0) {
    errors.confirmationPhrase = "ERR_DELETE_CONFIRMATION_REQUIRED";
  } else if (input.confirmationPhrase !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
    errors.confirmationPhrase = "ERR_DELETE_CONFIRMATION_MISMATCH";
  }

  return errors;
}
