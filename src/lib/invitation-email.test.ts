import { describe, expect, it } from "vitest";
import { buildInvitationEmail } from "./invitation-email";

describe("buildInvitationEmail", () => {
  it("renders english invitation copy", () => {
    const email = buildInvitationEmail({
      locale: "en",
      inviterName: "Sarah Muller",
      treeName: "The Smith Family",
      acceptUrl: "https://app.local/en/invitations/accept/tok",
      role: "editor",
      message: "Please join",
    });

    expect(email.subject).toContain("Invitation");
    expect(email.subject).toContain("The Smith Family");
    expect(email.html).toContain("Sarah Muller");
    expect(email.html).toContain("The Smith Family");
    expect(email.html).toContain("Editor");
    expect(email.html).toContain("Please join");
  });

  it("renders russian invitation copy", () => {
    const email = buildInvitationEmail({
      locale: "ru",
      inviterName: "Сара",
      treeName: "Семья Смит",
      acceptUrl: "https://app.local/ru/invitations/accept/tok",
      role: "viewer",
      message: null,
    });

    expect(email.subject).toContain("Приглашение");
    expect(email.subject).toContain("Семья Смит");
    expect(email.html).toContain("Сара");
    expect(email.html).toContain("Семья Смит");
    expect(email.html).toContain("Наблюдатель");
    expect(email.html).not.toContain("Сообщение:");
  });
});
