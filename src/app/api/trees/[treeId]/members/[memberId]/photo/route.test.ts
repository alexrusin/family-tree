import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  getTreeRoleMock,
  prismaMock,
  createS3ClientMock,
  downloadPhotoByKeyMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
    },
    treeMember: {
      findFirst: vi.fn(),
    },
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
    createS3ClientMock: vi.fn(() => ({})),
    downloadPhotoByKeyMock: vi.fn(),
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
}));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: createS3ClientMock,
  downloadPhotoByKey: downloadPhotoByKeyMock,
}));

const { GET } = await import("./route");

describe("GET /api/trees/[treeId]/members/[memberId]/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.S3_BUCKET = "test-bucket";

    getSessionMock.mockResolvedValue({ user: { id: "viewer-1" } });
    getTreeRoleMock.mockResolvedValue("viewer");
    prismaMock.treeMember.findFirst.mockResolvedValue({
      photoKey: "trees/t1/members/uuid.webp",
    });
    downloadPhotoByKeyMock.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });
  });

  it("streams a member photo for an authorized viewer", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1/photo",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
    expect(downloadPhotoByKeyMock).toHaveBeenCalledWith({
      s3Client: {},
      bucket: "test-bucket",
      key: "trees/t1/members/uuid.webp",
    });
  });

  it("allows unauthenticated access when the tree is publicly shared", async () => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.familyTree.findUnique.mockResolvedValue({ shareEnabled: true });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1/photo",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("returns 403 when an authenticated user cannot view the tree", async () => {
    getTreeRoleMock.mockResolvedValue("none");

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1/photo",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_FORBIDDEN",
    });
  });

  it("returns 404 for unauthenticated requests to private trees", async () => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.familyTree.findUnique.mockResolvedValue({ shareEnabled: false });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1/photo",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_MEMBER_PHOTO_NOT_FOUND",
    });
  });

  it("returns 404 when the member has no stored photo key", async () => {
    prismaMock.treeMember.findFirst.mockResolvedValue({ photoKey: null });

    const request = new NextRequest(
      "http://localhost/api/trees/t1/members/m1/photo",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ treeId: "t1", memberId: "m1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_MEMBER_PHOTO_NOT_FOUND",
    });
  });
});
