import { sendEmail } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type IssueReportEmailInput = {
  description: string;
  userEmail: string;
  pageUrl: string;
  treeId: string | null;
  locale: string;
  appVersion: string;
  createdAt: Date;
};

function resolveRecipient(): string {
  return (
    process.env.ISSUE_REPORT_NOTIFY_EMAIL ||
    process.env.MAILTRAP_FROM_EMAIL ||
    ""
  );
}

export function buildIssueReportEmail(input: IssueReportEmailInput) {
  const subject = "New Issue Report";
  const html = `<h2>New Issue Report</h2>
<table>
<tr><td><strong>Description</strong></td><td>${escapeHtml(input.description)}</td></tr>
<tr><td><strong>User Email</strong></td><td>${escapeHtml(input.userEmail)}</td></tr>
<tr><td><strong>Page URL</strong></td><td>${escapeHtml(input.pageUrl)}</td></tr>
<tr><td><strong>Tree ID</strong></td><td>${escapeHtml(input.treeId ?? "N/A")}</td></tr>
<tr><td><strong>Locale</strong></td><td>${escapeHtml(input.locale)}</td></tr>
<tr><td><strong>App Version</strong></td><td>${escapeHtml(input.appVersion)}</td></tr>
<tr><td><strong>Timestamp</strong></td><td>${escapeHtml(input.createdAt.toISOString())}</td></tr>
</table>`;

  return { subject, html };
}

export async function sendIssueReportNotification(
  input: IssueReportEmailInput,
): Promise<void> {
  const to = resolveRecipient();
  if (!to) return;
  const { subject, html } = buildIssueReportEmail(input);
  await sendEmail(to, subject, html);
}
