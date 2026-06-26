import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaClientMock, sendIssueReportNotificationMock } =
  vi.hoisted(() => {
    const getSessionMock = vi.fn();
    const prismaClientMock = {
      issueReport: {
        create: vi.fn(),
      },
    };
    const sendIssueReportNotificationMock = vi.fn();

    return { getSessionMock, prismaClientMock, sendIssueReportNotificationMock };
  });

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaClientMock }));

vi.mock("@/lib/app-version", () => ({
  getAppVersion: () => "test-version",
}));

vi.mock("@/lib/issue-report-email", () => ({
  sendIssueReportNotification: sendIssueReportNotificationMock,
}));

const { POST } = await import("./route");

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/issue-reports", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "TestBrowser/1.0",
    },
  });
}

describe("POST /api/issue-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "alex@example.com" },
    });
    prismaClientMock.issueReport.create.mockResolvedValue({ id: "ir1" });
    sendIssueReportNotificationMock.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated requests", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ description: "bug" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("rejects empty description", async () => {
    const response = await POST(makeRequest({ description: "   " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_DESCRIPTION_REQUIRED",
    });
    expect(prismaClientMock.issueReport.create).not.toHaveBeenCalled();
  });

  it("rejects over-length description", async () => {
    const response = await POST(
      makeRequest({ description: "a".repeat(2001) }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_DESCRIPTION_TOO_LONG",
    });
    expect(prismaClientMock.issueReport.create).not.toHaveBeenCalled();
  });

  it("persists a valid submission with all captured fields", async () => {
    const response = await POST(
      makeRequest({
        description: "The page crashed",
        pageUrl: "http://localhost/en/dashboard",
        locale: "es",
        treeId: "tree-123",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });

    expect(prismaClientMock.issueReport.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        userEmail: "alex@example.com",
        description: "The page crashed",
        pageUrl: "http://localhost/en/dashboard",
        treeId: "tree-123",
        userAgent: "TestBrowser/1.0",
        locale: "es",
        appVersion: "test-version",
        status: "open",
      },
    });
  });

  it("defaults locale to en and treeId to null when not provided", async () => {
    const response = await POST(
      makeRequest({
        description: "Something broke",
        pageUrl: "http://localhost/en/settings",
      }),
    );

    expect(response.status).toBe(201);

    const call = prismaClientMock.issueReport.create.mock.calls[0][0];
    expect(call.data.locale).toBe("en");
    expect(call.data.treeId).toBeNull();
  });

  it("sends a notification email after persisting", async () => {
    await POST(
      makeRequest({
        description: "The page crashed",
        pageUrl: "http://localhost/en/dashboard",
        locale: "es",
        treeId: "tree-123",
      }),
    );

    expect(sendIssueReportNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "The page crashed",
        userEmail: "alex@example.com",
        pageUrl: "http://localhost/en/dashboard",
        treeId: "tree-123",
        locale: "es",
        appVersion: "test-version",
      }),
    );
  });

  it("returns success even when notification email fails", async () => {
    sendIssueReportNotificationMock.mockRejectedValue(
      new Error("SMTP unavailable"),
    );

    const response = await POST(
      makeRequest({
        description: "Something broke",
        pageUrl: "http://localhost/en/settings",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaClientMock.issueReport.create).toHaveBeenCalled();
    expect(sendIssueReportNotificationMock).toHaveBeenCalled();
  });
});
