import { MailtrapClient } from "mailtrap";

// ============================================================================
// Email Configuration Validation
// ============================================================================

function validateEmailConfig(): void {
  const requiredVars = ["MAILTRAP_TOKEN", "MAILTRAP_FROM_EMAIL"];
  const isSandbox = process.env.NODE_ENV !== "production";

  if (isSandbox) {
    requiredVars.push("MAILTRAP_INBOX_ID");
  }

  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required email configuration: ${missingVars.join(", ")}. ` +
      `Please set these environment variables in your .env.local file.`
    );
  }
}

// Validate on module load
validateEmailConfig();

const mailClient = new MailtrapClient({
  token: process.env.MAILTRAP_TOKEN!,
  sandbox: process.env.NODE_ENV !== "production",
  testInboxId:
    process.env.NODE_ENV !== "production"
      ? Number(process.env.MAILTRAP_INBOX_ID)
      : undefined,
});

// ============================================================================
// Email Sending
// ============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  retries?: number;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  return sendEmailWithRetry({ to, subject, html });
}

async function sendEmailWithRetry(
  options: EmailOptions,
  attempt = 1
): Promise<void> {
  const maxRetries = options.retries ?? 3;

  try {
    const result = await mailClient.send({
      from: { email: process.env.MAILTRAP_FROM_EMAIL! },
      to: [{ email: options.to }],
      subject: options.subject,
      html: options.html,
    });

    console.log(`Email sent successfully to ${options.to}`, { messageId: result?.id });
  } catch (error) {
    if (attempt < maxRetries) {
      console.warn(
        `Failed to send email (attempt ${attempt}/${maxRetries}):`,
        error
      );
      // Exponential backoff: 1s, 2s, 4s...
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return sendEmailWithRetry(options, attempt + 1);
    }

    console.error(`Failed to send email to ${options.to} after ${maxRetries} attempts:`, error);
    throw new Error(
      `Failed to send email to ${options.to}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
