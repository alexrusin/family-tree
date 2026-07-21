import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaMock,
  createS3ClientMock,
  deletePhotoByKeyMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const createS3ClientMock = vi.fn();
  const deletePhotoByKeyMock = vi.fn();
  const prismaMock = {
    familyTree: { findUnique: vi.fn() },
    collaborator: { findUnique: vi.fn() },
    familyPicture: { findFirst: vi.fn(), delete: vi.fn() },
    generation: { findMany: vi.fn(), updateMany: vi.fn() },
    generationLedgerEntry: { create: vi.fn(), findMany: vi.fn() },
  };
  return { getSessionMock, prismaMock, createS3ClientMock, deletePhotoByKeyMock };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/photo-upload", () => ({
  createS3Client: createS3ClientMock,
  deletePhotoByKey: deletePhotoByKeyMock,
}));

const { GET, DELETE } = await import("./route");

function request(method: string) {
  return new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1", {
    method,
  });
}

function params() {
  return { params: Promise.resolve({ treeId: "t1", familyPictureId: "fp1" }) };
}

describe("/api/trees/[treeId]/family-pictures/[familyPictureId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET = "test-bucket";

    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prismaMock.generation.findMany.mockResolvedValue([]);
    createS3ClientMock.mockReturnValue({});
    deletePhotoByKeyMock.mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("404s when the Family Picture doesn't exist", async () => {
      prismaMock.familyPicture.findFirst.mockResolvedValue(null);

      const response = await GET(request("GET"), params());

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
    });

    it("404s when the Family Picture belongs to someone else", async () => {
      prismaMock.familyPicture.findFirst.mockResolvedValue({
        userId: "someone-else",
        generations: [],
        versions: [],
      });

      const response = await GET(request("GET"), params());

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    function mockPicture(overrides: {
      userId?: string;
      versions?: { s3Key: string }[];
      generations?: { status: string }[];
    } = {}) {
      prismaMock.familyPicture.findFirst.mockResolvedValue({
        userId: "user-1",
        versions: [{ s3Key: "users/user-1/family-pictures/fp1/v1.webp" }],
        generations: [{ status: "succeeded" }],
        ...overrides,
      });
    }

    it("deletes every Version's S3 object, then the Family Picture row", async () => {
      mockPicture({
        versions: [
          { s3Key: "users/user-1/family-pictures/fp1/v1.webp" },
          { s3Key: "users/user-1/family-pictures/fp1/v2.webp" },
        ],
      });
      prismaMock.familyPicture.delete.mockResolvedValue({});

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true });
      expect(deletePhotoByKeyMock).toHaveBeenCalledWith({
        s3Client: {},
        bucket: "test-bucket",
        key: "users/user-1/family-pictures/fp1/v1.webp",
      });
      expect(deletePhotoByKeyMock).toHaveBeenCalledWith({
        s3Client: {},
        bucket: "test-bucket",
        key: "users/user-1/family-pictures/fp1/v2.webp",
      });
      expect(prismaMock.familyPicture.delete).toHaveBeenCalledWith({
        where: { id: "fp1" },
      });
    });

    it("404s when the Family Picture doesn't exist", async () => {
      prismaMock.familyPicture.findFirst.mockResolvedValue(null);

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
      expect(prismaMock.familyPicture.delete).not.toHaveBeenCalled();
    });

    it("404s when the Family Picture belongs to someone else", async () => {
      mockPicture({ userId: "someone-else" });

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
      expect(prismaMock.familyPicture.delete).not.toHaveBeenCalled();
    });

    it("409s while the latest Generation is still pending", async () => {
      mockPicture({ generations: [{ status: "pending" }] });

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        errorCode: "ERR_GENERATION_IN_PROGRESS",
      });
      expect(prismaMock.familyPicture.delete).not.toHaveBeenCalled();
      expect(deletePhotoByKeyMock).not.toHaveBeenCalled();
    });

    it("still deletes the row when an S3 delete fails", async () => {
      mockPicture();
      deletePhotoByKeyMock.mockRejectedValue(new Error("S3 unavailable"));
      prismaMock.familyPicture.delete.mockResolvedValue({});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(200);
      expect(prismaMock.familyPicture.delete).toHaveBeenCalledWith({
        where: { id: "fp1" },
      });

      consoleErrorSpy.mockRestore();
    });

    it("500s when S3_BUCKET is not configured", async () => {
      mockPicture();
      delete process.env.S3_BUCKET;
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ errorCode: "ERR_INTERNAL" });
      expect(prismaMock.familyPicture.delete).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("rejects an unauthenticated (guest) request", async () => {
      getSessionMock.mockResolvedValue(null);

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(401);
    });

    // A Family Picture outlives its source tree, so its owner must still be
    // able to delete it once the tree — and any role they had on it — is gone.
    it("lets the owner delete a picture whose source tree no longer exists", async () => {
      mockPicture();
      prismaMock.familyTree.findUnique.mockResolvedValue(null);
      prismaMock.collaborator.findUnique.mockResolvedValue(null);
      prismaMock.familyPicture.delete.mockResolvedValue({});

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(200);
      expect(prismaMock.familyPicture.delete).toHaveBeenCalledWith({
        where: { id: "fp1" },
      });
    });

    it("lets the owner delete a picture after losing their role on the tree", async () => {
      mockPicture();
      prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "someone-else" });
      prismaMock.collaborator.findUnique.mockResolvedValue(null);
      prismaMock.familyPicture.delete.mockResolvedValue({});

      const response = await DELETE(request("DELETE"), params());

      expect(response.status).toBe(200);
      expect(prismaMock.familyPicture.delete).toHaveBeenCalledWith({
        where: { id: "fp1" },
      });
    });
  });
});
