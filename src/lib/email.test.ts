import { describe, it, expect, vi, afterEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue(undefined);
const MockMailtrapClient = vi.fn(function () {
  return { send: mockSend };
});

vi.mock("mailtrap", () => ({
  MailtrapClient: MockMailtrapClient,
}));

// Import after mocking
const { sendEmail } = await import("./email");

const BASE_ENV = {
  MAILTRAP_TOKEN: "test-token",
  MAILTRAP_FROM_EMAIL: "no-reply@example.com",
  MAILTRAP_INBOX_ID: "42",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("sendEmail", () => {
  it("uses sandbox mode with correct inboxId when NODE_ENV is not production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);

    await sendEmail("user@example.com", "Hello", "<p>Hi</p>");

    expect(MockMailtrapClient).toHaveBeenCalledWith({
      token: "test-token",
      sandbox: true,
      testInboxId: 42,
    });
  });

  it("uses production mode when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);

    await sendEmail("user@example.com", "Hello", "<p>Hi</p>");

    expect(MockMailtrapClient).toHaveBeenCalledWith({
      token: "test-token",
      sandbox: false,
      testInboxId: undefined,
    });
  });

  it("passes to, subject, and html to the Mailtrap client", async () => {
    vi.stubEnv("NODE_ENV", "test");
    for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);

    await sendEmail("recipient@example.com", "My Subject", "<b>Body</b>");

    expect(mockSend).toHaveBeenCalledWith({
      from: { email: "no-reply@example.com" },
      to: [{ email: "recipient@example.com" }],
      subject: "My Subject",
      html: "<b>Body</b>",
    });
  });

  it("propagates errors thrown by the Mailtrap client", async () => {
    vi.stubEnv("NODE_ENV", "test");
    for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);

    const error = new Error("Mailtrap API error");
    mockSend.mockRejectedValue(error);

    await expect(
      sendEmail("user@example.com", "Hello", "<p>Hi</p>")
    ).rejects.toThrow("Mailtrap API error");
  });
});
