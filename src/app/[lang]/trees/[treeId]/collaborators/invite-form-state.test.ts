import { describe, expect, it } from "vitest";
import {
  INVITE_MESSAGE_MAX_LENGTH,
  validateInviteInput,
} from "./invite-form-state";

describe("invite form state", () => {
  it("rejects invalid email", () => {
    expect(
      validateInviteInput({
        email: "bad",
        role: "editor",
        message: "",
      }),
    ).toBe("ERR_INVALID_EMAIL");
  });

  it("rejects invalid role", () => {
    expect(
      validateInviteInput({
        email: "person@example.com",
        role: "owner",
        message: "hello",
      }),
    ).toBe("ERR_INVALID_ROLE");
  });

  it("rejects too long message", () => {
    expect(
      validateInviteInput({
        email: "person@example.com",
        role: "viewer",
        message: "x".repeat(INVITE_MESSAGE_MAX_LENGTH + 1),
      }),
    ).toBe("ERR_MESSAGE_TOO_LONG");
  });

  it("accepts valid invite input", () => {
    expect(
      validateInviteInput({
        email: " PERSON@example.com ",
        role: "viewer",
        message: "Please join",
      }),
    ).toBeNull();
  });
});
