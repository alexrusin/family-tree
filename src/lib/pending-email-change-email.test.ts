import { describe, expect, it } from "vitest";
import { buildPendingEmailChangeEmail } from "./pending-email-change-email";

describe("buildPendingEmailChangeEmail", () => {
  it("renders english pending email-change copy", () => {
    const email = buildPendingEmailChangeEmail({
      locale: "en",
      verifyUrl: "https://app.local/en/verify-email-change/token",
      nextEmail: "new@example.com",
    });

    expect(email.subject).toContain("Verify your new email");
    expect(email.html).toContain("new@example.com");
    expect(email.html).toContain(
      "https://app.local/en/verify-email-change/token",
    );
  });

  it("renders russian pending email-change copy", () => {
    const email = buildPendingEmailChangeEmail({
      locale: "ru",
      verifyUrl: "https://app.local/ru/verify-email-change/token",
      nextEmail: "new@example.com",
    });

    expect(email.subject).toContain("Подтвердите новый email");
    expect(email.html).toContain("new@example.com");
    expect(email.html).toContain(
      "https://app.local/ru/verify-email-change/token",
    );
  });

  it("renders spanish pending email-change copy", () => {
    const email = buildPendingEmailChangeEmail({
      locale: "es",
      verifyUrl: "https://app.local/es/verify-email-change/token",
      nextEmail: "nuevo@example.com",
    });

    expect(email.subject).toContain("Verifica tu nuevo email");
    expect(email.html).toContain("nuevo@example.com");
    expect(email.html).toContain(
      "https://app.local/es/verify-email-change/token",
    );
  });
});
