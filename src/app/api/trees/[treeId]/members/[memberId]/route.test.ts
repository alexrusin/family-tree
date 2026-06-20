import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  getTreeRoleMock,
  prismaMock,
  createS3ClientMock,
  deletePhotoByKeyMock,
  generatePhotoKeyMock,
  photoPublicUrlMock,
  processImageMock,
  uploadProcessedPhotoMock,
  validatePhotoFileMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    treeMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      await callback(prismaMock);
    }),
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
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

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
  canEditMembers: (role: string) => role === "owner" || role === "editor",
  canDeleteMembers: (role: string) => role === "owner",
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
    getTreeRoleMock.mockResolvedValue("owner");
    prismaMock.treeMember.findFirst.mockResolvedValue({
      id: "m1",
      treeId: "t1",
      photoKey: null,
      photoUrl: null,
    });
    prismaMock.treeMember.update.mockResolvedValue({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: null,
      photoUrl: null,
    });
    prismaMock.treeMember.delete.mockResolvedValue({ id: "m1" });
    prismaMock.familyTree.update.mockResolvedValue({ id: "t1" });
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
    expect(prismaMock.treeMember.update).not.toHaveBeenCalled();
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

    prismaMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: "trees/t1/members/old-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/old-photo.webp",
    });
    prismaMock.treeMember.update.mockResolvedValueOnce({
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
        photoUrl: "/api/trees/t1/members/m1/photo?v=new-photo",
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
    expect(prismaMock.treeMember.update).toHaveBeenCalledWith({
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
    expect(prismaMock.treeMember.update).not.toHaveBeenCalled();
  });

  it("removes a member photo when removePhoto is set", async () => {
    prismaMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: "trees/t1/members/old-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/old-photo.webp",
    });
    prismaMock.treeMember.update.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: null,
      photoUrl: null,
    });

    const formData = makeFormData({
      firstName: "Elena",
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
      removePhoto: "true",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "PATCH", body: formData },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.treeMember.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({
        photoKey: null,
        photoUrl: null,
      }),
    });
    expect(deletePhotoByKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "trees/t1/members/old-photo.webp",
      }),
    );
  });

  it("replace wins: new photo file overrides removePhoto flag", async () => {
    prismaMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: "trees/t1/members/old-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/old-photo.webp",
    });
    prismaMock.treeMember.update.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: "trees/t1/members/new-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/new-photo.webp",
    });

    const formData = makeFormData({
      firstName: "Elena",
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
      removePhoto: "true",
    });
    formData.append("photo", new File(["avatar"], "avatar.png", { type: "image/png" }));

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "PATCH", body: formData },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(uploadProcessedPhotoMock).toHaveBeenCalled();
    expect(prismaMock.treeMember.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({
        photoKey: "trees/t1/members/new-photo.webp",
      }),
    });
  });

  it("removePhoto is a no-op when the member has no photo", async () => {
    prismaMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: null,
      photoUrl: null,
    });
    prismaMock.treeMember.update.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: null,
      photoUrl: null,
    });

    const formData = makeFormData({
      firstName: "Elena",
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
      removePhoto: "true",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "PATCH", body: formData },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(deletePhotoByKeyMock).not.toHaveBeenCalled();
  });

  it("returns success even when S3 delete fails during photo removal", async () => {
    prismaMock.treeMember.findFirst.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      photoKey: "trees/t1/members/old-photo.webp",
      photoUrl: "https://bucket.example.com/trees/t1/members/old-photo.webp",
    });
    prismaMock.treeMember.update.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
      photoKey: null,
      photoUrl: null,
    });
    deletePhotoByKeyMock.mockRejectedValueOnce(new Error("S3 failure"));

    const formData = makeFormData({
      firstName: "Elena",
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
      removePhoto: "true",
    });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "PATCH", body: formData },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.treeMember.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: expect.objectContaining({
        photoKey: null,
        photoUrl: null,
      }),
    });
  });

  it("deletes the member and removes only its saved position from the arrangement", async () => {
    const existingArrangement = {
      m1: { x: 10, y: 20 },
      m2: { x: 30, y: 40 },
    };
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ nodePositions: existingArrangement });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeDefined();
    expect(arrangementUpdateCall![0].data.nodePositions).toEqual({
      m2: { x: 30, y: 40 },
    });
  });

  it("deletes the member without touching the arrangement when the member has no saved position", async () => {
    const existingArrangement = { m2: { x: 30, y: 40 } };
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ nodePositions: existingArrangement });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeUndefined();
  });

  it("deletes the member without touching the arrangement when the tree has no saved arrangement", async () => {
    prismaMock.familyTree.findUnique
      .mockResolvedValueOnce({ nodePositions: null });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    const arrangementUpdateCall = prismaMock.familyTree.update.mock.calls.find(
      (call) => call[0]?.data?.nodePositions !== undefined,
    );
    expect(arrangementUpdateCall).toBeUndefined();
  });
});
