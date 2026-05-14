import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaClientMock,
  prismaClientConstructorMock,
  prismaPgMock,
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
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback(prismaClientMock);
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
  validatePhotoFile: vi.fn(),
  processImage: vi.fn(),
  uploadProcessedPhoto: vi.fn(),
  createS3Client: vi.fn(() => ({})),
  generatePhotoKey: vi.fn(() => "trees/t1/members/uuid.webp"),
  photoPublicUrl: vi.fn(
    () =>
      "https://bucket.s3.us-east-1.amazonaws.com/trees/t1/members/uuid.webp",
  ),
}));

const { POST } = await import("./route");

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

describe("POST /api/trees/[treeId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    prismaClientMock.familyTree.findUnique.mockResolvedValue({ ownerId: "u1" });
    prismaClientMock.collaborator.findUnique.mockResolvedValue(null);
    prismaClientMock.treeMember.create.mockResolvedValue({ id: "m1" });
    prismaClientMock.familyTree.update.mockResolvedValue({ id: "t1" });
  });

  it("returns 401 for unauthenticated request", async () => {
    getSessionMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/trees/t1/members", {
      method: "POST",
      body: makeFormData({ firstName: "Elena", isLiving: "false" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_UNAUTHORIZED",
    });
  });

  it("returns 400 when firstName is missing or blank", async () => {
    const request = new NextRequest("http://localhost/api/trees/t1/members", {
      method: "POST",
      body: makeFormData({ firstName: "   ", isLiving: "false" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FIRST_NAME_REQUIRED",
    });
    expect(prismaClientMock.treeMember.create).not.toHaveBeenCalled();
  });

  it("creates a member and increments tree memberCount", async () => {
    prismaClientMock.treeMember.create.mockResolvedValueOnce({
      id: "m1",
      treeId: "t1",
      firstName: "Elena",
      isLiving: false,
    });

    const request = new NextRequest("http://localhost/api/trees/t1/members", {
      method: "POST",
      body: makeFormData({ firstName: " Elena ", isLiving: "false" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      member: {
        id: "m1",
        treeId: "t1",
        firstName: "Elena",
        isLiving: false,
      },
    });
    expect(prismaClientMock.treeMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        treeId: "t1",
        firstName: "Elena",
        isLiving: false,
      }),
    });
    expect(prismaClientMock.familyTree.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { memberCount: { increment: 1 } },
    });
  });
});
