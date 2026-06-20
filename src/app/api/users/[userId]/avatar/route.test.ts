import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, createS3ClientMock, downloadPhotoByKeyMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    createS3ClientMock: vi.fn(),
    downloadPhotoByKeyMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: createS3ClientMock,
  downloadPhotoByKey: downloadPhotoByKeyMock,
}));

const { GET } = await import("./route");

describe("GET /api/users/[userId]/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.S3_BUCKET = "test-bucket";

    getSessionMock.mockResolvedValue({ user: { id: "viewer-1" } });
    createS3ClientMock.mockReturnValue({});
    downloadPhotoByKeyMock.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });
  });

  it("streams avatar image bytes from S3", async () => {
    const request = new NextRequest("http://localhost/api/users/u1/avatar", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ userId: "u1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
    expect(downloadPhotoByKeyMock).toHaveBeenCalledWith({
      s3Client: {},
      bucket: "test-bucket",
      key: "users/u1/avatar.webp",
    });
  });

  it("returns 404 when the avatar key does not exist", async () => {
    downloadPhotoByKeyMock.mockRejectedValue({ Code: "NoSuchKey" });

    const request = new NextRequest("http://localhost/api/users/u1/avatar", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ userId: "u1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_AVATAR_NOT_FOUND",
    });
  });
});
