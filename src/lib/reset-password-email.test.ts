import { describe, expect, it } from "vitest";
import { buildResetPasswordEmail } from "./reset-password-email";

describe("buildResetPasswordEmail", () => {
  it("renders english reset-password email copy", () => {
    const email = buildResetPasswordEmail({
      locale: "en",
      resetLink: "https://app.local/en/reset-password?token=abc",
    });

    expect(email.subject).toContain("Reset your password");
    expect(email.html).toContain(
      "https://app.local/en/reset-password?token=abc",
    );
    expect(email.html).toContain("Reset password");
  });

  it("renders spanish reset-password email copy", () => {
    const email = buildResetPasswordEmail({
      locale: "es",
      resetLink: "https://app.local/es/reset-password?token=abc",
    });

    expect(email.subject).toContain("Restablece tu contraseña");
    expect(email.html).toContain(
      "https://app.local/es/reset-password?token=abc",
    );
    expect(email.html).toContain("Restablecer contraseña");
  });

  it("renders russian reset-password email copy", () => {
    const email = buildResetPasswordEmail({
      locale: "ru",
      resetLink: "https://app.local/ru/reset-password?token=abc",
    });

    expect(email.subject).toContain("Сброс пароля");
    expect(email.html).toContain(
      "https://app.local/ru/reset-password?token=abc",
    );
    expect(email.html).toContain("Сбросить пароль");
  });
});
