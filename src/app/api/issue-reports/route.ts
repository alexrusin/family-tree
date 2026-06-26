import { withSession } from "@/lib/with-session";
import { validateDescriptionInput } from "@/lib/issue-report-form-state";
import { getAppVersion } from "@/lib/app-version";
import { sendIssueReportNotification } from "@/lib/issue-report-email";
import type { Locale } from "@/generated/prisma/client";

const VALID_LOCALES = new Set(["en", "es", "ru"]);

export const POST = withSession(async ({ prisma, user, request }) => {
  const body = (await request.json().catch(() => null)) as {
    description?: unknown;
    pageUrl?: unknown;
    treeId?: unknown;
    locale?: unknown;
  } | null;

  const description =
    typeof body?.description === "string" ? body.description : "";

  const validationError = validateDescriptionInput(description);
  if (validationError) {
    return Response.json({ errorCode: validationError }, { status: 400 });
  }

  const pageUrl = typeof body?.pageUrl === "string" ? body.pageUrl : "";
  const treeId =
    typeof body?.treeId === "string" && body.treeId.length > 0
      ? body.treeId
      : null;
  const locale =
    typeof body?.locale === "string" && VALID_LOCALES.has(body.locale)
      ? (body.locale as Locale)
      : ("en" as Locale);

  const userAgent = request.headers.get("user-agent") ?? "";
  const userEmail = typeof user.email === "string" ? user.email : "";

  const appVersion = getAppVersion();

  await prisma.issueReport.create({
    data: {
      userId: user.id,
      userEmail,
      description: description.trim(),
      pageUrl,
      treeId,
      userAgent,
      locale,
      appVersion,
      status: "open",
    },
  });

  try {
    await sendIssueReportNotification({
      description: description.trim(),
      userEmail,
      pageUrl,
      treeId,
      locale,
      appVersion,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to send issue report notification:", error);
  }

  return Response.json({ success: true }, { status: 201 });
});
