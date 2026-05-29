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

  it("renders spanish invitation copy", () => {
    const email = buildInvitationEmail({
      locale: "es",
      inviterName: "Carlos",
      treeName: "Familia García",
      acceptUrl: "https://app.local/es/invitations/accept/tok",
      role: "editor",
      message: "Por favor únete",
    });

    expect(email.subject).toContain("Invitación");
    expect(email.subject).toContain("Familia García");
    expect(email.html).toContain("Carlos");
    expect(email.html).toContain("Familia García");
    expect(email.html).toContain("Editor");
    expect(email.html).toContain("Por favor únete");
  });

  it("renders spanish invitation copy without message", () => {
    const email = buildInvitationEmail({
      locale: "es",
      inviterName: "Ana",
      treeName: "Familia López",
      acceptUrl: "https://app.local/es/invitations/accept/tok",
      role: "viewer",
      message: null,
    });

    expect(email.subject).toContain("Invitación");
    expect(email.html).toContain("Observador");
    expect(email.html).not.toContain("Mensaje:");
  });
});
