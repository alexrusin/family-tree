import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
  createS3ClientMock,
  deletePhotoByKeyMock,
  generatePhotoKeyMock,
  photoPublicUrlMock,
  processImageMock,
  uploadProcessedPhotoMock,
  validatePhotoFileMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaClientMock = {
    familyTree: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    collaborator: {
      findUnique: vi.fn(),
    },
    treeMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      await callback(prismaClientMock);
    }),
  };

  return {
    getSessionMock,
    prismaClientMock,
    prismaClientConstructorMock: vi.fn(function PrismaClientMock() {
      return prismaClientMock;
    }),
    prismaPgMock: vi.fn(function PrismaPgMock() {
      return {};
    }),
    createS3ClientMock: vi.fn(() => ({})),
    deletePhotoByKeyMock: vi.fn(),
    generatePhotoKeyMock: vi.fn(() => "trees/t1/members/new-photo.webp"),
    photoPublicUrlMock: vi.fn(
      (key: string) => `https://bucket.example.com/${key}`,
    ),
    processImageMock: vi.fn(async (buffer: Buffer) => buffer),
    uploadProcessedPhotoMock: vi.fn(),
    validatePhotoFileMock: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientConstructorMock,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: prismaPgMock,
}));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: createS3ClientMock,
  deletePhotoByKey: deletePhotoByKeyMock,
  generatePhotoKey: generatePhotoKeyMock,
  photoPublicUrl: photoPublicUrlMock,
  processImage: processImageMock,
  uploadProcessedPhoto: uploadProcessedPhotoMock,
  validatePhotoFile: validatePhotoFileMock,
}));

const { PATCH, DELETE } = await import("./route");

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

describe("/api/trees/[treeId]/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.treeMember.findFirst.mockResolvedValue({
      id: "m1",
      treeId: "t1",
      photoKey: null,
      photoUrl: null,
    });
    prismaClientMock.treeMember.update.mockResolvedValue({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: null,
      photoUrl: null,
    });
    prismaClientMock.treeMember.delete.mockResolvedValue({ id: "m1" });
    prismaClientMock.familyTree.update.mockResolvedValue({ id: "t1" });
  });

  it("returns 401 for unauthenticated PATCH", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: JSON.stringify({ firstName: "Elena" }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 when PATCH firstName is blank", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: JSON.stringify({ firstName: "   " }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FIRST_NAME_REQUIRED",
    });
    expect(prismaClientMock.treeMember.update).not.toHaveBeenCalled();
  });

  it("updates a member photo via multipart PATCH and returns the proxy URL", async () => {
    const formData = makeFormData({
      firstName: " Elena ",
      lastName: "",
      gender: "female",
      bio: "",
      isLiving: "false",
      birthPrecision: "",
      birthYear: "",
      birthMonth: "",
      birthDay: "",
      deathPrecision: "",
      deathYear: "",
      deathMonth: "",
      deathDay: "",
    });
    formData.append("photo", new File(["avatar"], "avatar.png", { type: "image/png" }));

    prismaClientMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: "trees/t1/members/old-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/old-photo.webp",
    });
    prismaClientMock.treeMember.update.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: "trees/t1/members/new-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/new-photo.webp",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: formData,
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      member: expect.objectContaining({
        id: "m1",
        treeId: "t1",
        firstName: "Elena",
        photoKey: "trees/t1/members/new-photo.webp",
        photoUrl: "/api/trees/t1/members/m1/photo",
      }),
    });
    expect(validatePhotoFileMock).toHaveBeenCalledWith({
      contentType: "image/png",
      sizeBytes: 6,
    });
    expect(uploadProcessedPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "trees/t1/members/new-photo.webp",
      }),
    );
    expect(prismaClientMock.treeMember.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({
        firstName: "Elena",
        lastName: null,
        gender: "female",
        photoKey: "trees/t1/members/new-photo.webp",
        photoUrl: "https://bucket.example.com/trees/t1/members/new-photo.webp",
      }),
    });
    expect(deletePhotoByKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "trees/t1/members/old-photo.webp",
      }),
    );
  });

  it("returns 400 when the uploaded PATCH photo is invalid", async () => {
    validatePhotoFileMock.mockImplementationOnce(() => {
      throw new Error("ERR_IMAGE_TOO_LARGE");
    });

    const formData = makeFormData({
      firstName: "Elena",
      lastName: "",
      gender: "female",
      bio: "",
      isLiving: "true",
      birthPrecision: "",
      birthYear: "",
      birthMonth: "",
      birthDay: "",
      deathPrecision: "",
      deathYear: "",
      deathMonth: "",
      deathDay: "",
    });
    formData.append("photo", new File(["avatar"], "avatar.png", { type: "image/png" }));

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "PATCH",
        body: formData,
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_IMAGE_TOO_LARGE",
    });
    expect(prismaClientMock.treeMember.update).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated DELETE", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 403 for editor DELETE (owner-only action)", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u2" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue({
      role: "editor",
      acceptedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("deletes the member and removes only its saved position from the arrangement", async () => {
    const existingArrangement = {
      m1: { x: 10, y: 20 },
      m2: { x: 30, y: 40 },
    };
    prismaClientMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "u1" }) // getTreeRole
      .mockResolvedValueOnce({ nodePositions: existingArrangement }); // prune inside tx

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaClientMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeDefined();
    expect(arrangementUpdateCall![0].data.nodePositions).toEqual({
      m2: { x: 30, y: 40 },
    });
  });

  it("deletes the member without touching the arrangement when the member has no saved position", async () => {
    const existingArrangement = { m2: { x: 30, y: 40 } };
    prismaClientMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "u1" })
      .mockResolvedValueOnce({ nodePositions: existingArrangement });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaClientMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeUndefined();
  });

  it("deletes the member without touching the arrangement when the tree has no saved arrangement", async () => {
    prismaClientMock.familyTree.findUnique
      .mockResolvedValueOnce({ ownerId: "u1" })
      .mockResolvedValueOnce({ nodePositions: null });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaClientMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeUndefined();
  });
});
