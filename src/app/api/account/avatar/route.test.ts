import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  validatePhotoFileMock,
  processImageMock,
  uploadProcessedPhotoMock,
  createS3ClientMock,
  deletePhotoByKeyMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const validatePhotoFileMock = vi.fn();
  const processImageMock = vi.fn();
  const uploadProcessedPhotoMock = vi.fn();
  const createS3ClientMock = vi.fn();
  const deletePhotoByKeyMock = vi.fn();

  const prismaClientMock = {
    user: {
      update: vi.fn(),
    },
  };

  return {
    getSessionMock,
    prismaClientMock,
    validatePhotoFileMock,
    processImageMock,
    uploadProcessedPhotoMock,
    createS3ClientMock,
    deletePhotoByKeyMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaClientMock }));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  validatePhotoFile: validatePhotoFileMock,
  processImage: processImageMock,
  uploadProcessedPhoto: uploadProcessedPhotoMock,
  createS3Client: createS3ClientMock,
  deletePhotoByKey: deletePhotoByKeyMock,
}));

const { PATCH, DELETE } = await import("./route");

function makeRequestWithAvatar(file?: Blob): NextRequest {
  const formData = new FormData();
  if (file) {
    formData.append("avatar", file, "avatar.png");
  }

  return new NextRequest("http://localhost/api/account/avatar", {
    method: "PATCH",
    body: formData,
  });
}

describe("PATCH /api/account/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.S3_BUCKET = "test-bucket";

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    validatePhotoFileMock.mockImplementation(() => undefined);
    processImageMock.mockResolvedValue(Buffer.from("webp"));
    createS3ClientMock.mockReturnValue({});

    prismaClientMock.user.update.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      image: "/api/users/u1/avatar",
      pendingEmailChange: null,
    });
  });

  it("returns 400 when avatar file is missing", async () => {
    const response = await PATCH(makeRequestWithAvatar());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_AVATAR_REQUIRED",
    });
  });

  it("returns 400 when avatar validation fails", async () => {
    validatePhotoFileMock.mockImplementation(() => {
      throw new Error("ERR_IMAGE_TOO_LARGE");
    });

    const file = new Blob(["x"], { type: "image/png" });
    const response = await PATCH(makeRequestWithAvatar(file));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_IMAGE_TOO_LARGE",
    });
  });

  it("uploads processed avatar and updates user image", async () => {
    const file = new Blob(["avatar-data"], { type: "image/png" });
    const response = await PATCH(makeRequestWithAvatar(file));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex",
        email: "alex@example.com",
        avatarUrl: "/api/users/u1/avatar",
        pendingEmailChange: null,
      },
    });

    expect(validatePhotoFileMock).toHaveBeenCalledWith({
      contentType: "image/png",
      sizeBytes: file.size,
    });
    expect(uploadProcessedPhotoMock).toHaveBeenCalled();
    expect(prismaClientMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        image: "/api/users/u1/avatar",
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });
  });
});

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/account/avatar", {
    method: "DELETE",
  });
}

describe("DELETE /api/account/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.S3_BUCKET = "test-bucket";

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    deletePhotoByKeyMock.mockResolvedValue(undefined);
    createS3ClientMock.mockReturnValue({});

    prismaClientMock.user.update.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      image: null,
      pendingEmailChange: null,
    });
  });

  it("deletes S3 object, nulls user image, and returns profile with avatarUrl null", async () => {
    const response = await DELETE(makeDeleteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex",
        email: "alex@example.com",
        avatarUrl: null,
        pendingEmailChange: null,
      },
    });

    expect(deletePhotoByKeyMock).toHaveBeenCalledWith({
      s3Client: {},
      bucket: "test-bucket",
      key: "users/u1/avatar.webp",
    });

    expect(prismaClientMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });
  });

  it("returns 200 when no avatar exists (idempotent)", async () => {
    prismaClientMock.user.update.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      image: null,
      pendingEmailChange: null,
    });

    const response = await DELETE(makeDeleteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex",
        email: "alex@example.com",
        avatarUrl: null,
        pendingEmailChange: null,
      },
    });
  });

  it("tolerates NoSuchKey from S3 and still returns 200", async () => {
    const noSuchKeyError = new Error("NoSuchKey");
    noSuchKeyError.name = "NoSuchKey";
    deletePhotoByKeyMock.mockRejectedValueOnce(noSuchKeyError);

    const response = await DELETE(makeDeleteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "u1",
        displayName: "Alex",
        email: "alex@example.com",
        avatarUrl: null,
        pendingEmailChange: null,
      },
    });

    expect(prismaClientMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        pendingEmailChange: {
          select: {
            newEmail: true,
            expiresAt: true,
          },
        },
      },
    });
  });
});
