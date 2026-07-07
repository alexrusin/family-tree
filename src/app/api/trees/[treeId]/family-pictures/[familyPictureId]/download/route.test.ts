import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaMock,
  createS3ClientMock,
  downloadPhotoByKeyMock,
  burnAiGeneratedLabelMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaMock = {
    familyTree: { findUnique: vi.fn() },
    collaborator: { findUnique: vi.fn() },
    familyPicture: { findFirst: vi.fn() },
  };
  return {
    getSessionMock,
    prismaMock,
    createS3ClientMock: vi.fn(() => ({})),
    downloadPhotoByKeyMock: vi.fn(),
    burnAiGeneratedLabelMock: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: createS3ClientMock,
  downloadPhotoByKey: downloadPhotoByKeyMock,
}));

vi.mock("@/lib/family-picture/watermark", () => ({
  burnAiGeneratedLabel: burnAiGeneratedLabelMock,
}));

const { GET } = await import("./route");

function params() {
  return { params: Promise.resolve({ treeId: "t1", familyPictureId: "fp1" }) };
}

describe("/api/trees/[treeId]/family-pictures/[familyPictureId]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET = "test-bucket";
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "user-1" });
    downloadPhotoByKeyMock.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });
    burnAiGeneratedLabelMock.mockResolvedValue(new Uint8Array([9, 9, 9]));
  });

  it("serves the current Version as a watermarked attachment", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "user-1",
      currentVersionNumber: 2,
      versions: [
        { s3Key: "k2", versionNumber: 2 },
        { s3Key: "k1", versionNumber: 1 },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/download"),
      params(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="family-picture-v2.webp"',
    );
    expect(downloadPhotoByKeyMock).toHaveBeenCalledWith({
      s3Client: {},
      bucket: "test-bucket",
      key: "k2",
    });
    expect(burnAiGeneratedLabelMock).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
    );

    const body = new Uint8Array(await response.arrayBuffer());
    expect(body).toEqual(new Uint8Array([9, 9, 9]));
  });

  it("serves a specific requested Version via ?v=", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "user-1",
      currentVersionNumber: 2,
      versions: [
        { s3Key: "k2", versionNumber: 2 },
        { s3Key: "k1", versionNumber: 1 },
      ],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/trees/t1/family-pictures/fp1/download?v=1",
      ),
      params(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="family-picture-v1.webp"',
    );
    expect(downloadPhotoByKeyMock).toHaveBeenCalledWith({
      s3Client: {},
      bucket: "test-bucket",
      key: "k1",
    });
  });

  it("404s when the Family Picture doesn't belong to the caller", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "someone-else",
      currentVersionNumber: 1,
      versions: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/download"),
      params(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
    expect(downloadPhotoByKeyMock).not.toHaveBeenCalled();
  });

  it("404s when there is no Version to serve", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "user-1",
      currentVersionNumber: null,
      versions: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/download"),
      params(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
  });

  it("rejects an unauthenticated (guest) request", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/download"),
      params(),
    );

    expect(response.status).toBe(401);
  });
});
