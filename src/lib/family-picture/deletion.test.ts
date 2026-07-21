import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFamilyPicture } from "./deletion";

function makeDeps(picture: {
  userId: string;
  versions: { s3Key: string }[];
  generations: { status: string }[];
} | null) {
  const findFirst = vi.fn().mockResolvedValue(picture);
  const del = vi.fn().mockResolvedValue({});
  const deletePhoto = vi.fn().mockResolvedValue(undefined);

  return {
    deps: {
      prisma: { familyPicture: { findFirst, delete: del } },
      deletePhoto,
    },
    findFirst,
    del,
    deletePhoto,
  };
}

const target = { familyPictureId: "fp1", treeId: "t1", userId: "user-1" };

describe("deleteFamilyPicture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes every Version's image before deleting the row", async () => {
    const { deps, del, deletePhoto } = makeDeps({
      userId: "user-1",
      versions: [{ s3Key: "v1.webp" }, { s3Key: "v2.webp" }],
      generations: [{ status: "succeeded" }],
    });

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({ ok: true });

    expect(deletePhoto).toHaveBeenCalledWith("v1.webp");
    expect(deletePhoto).toHaveBeenCalledWith("v2.webp");
    expect(del).toHaveBeenCalledWith({ where: { id: "fp1" } });
  });

  it("reports a picture owned by someone else as not found", async () => {
    const { deps, del, deletePhoto } = makeDeps({
      userId: "someone-else",
      versions: [{ s3Key: "v1.webp" }],
      generations: [{ status: "succeeded" }],
    });

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({
      ok: false,
      errorCode: "ERR_NOT_FOUND",
    });
    expect(deletePhoto).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("reports a missing picture as not found", async () => {
    const { deps, del } = makeDeps(null);

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({
      ok: false,
      errorCode: "ERR_NOT_FOUND",
    });
    expect(del).not.toHaveBeenCalled();
  });

  it("refuses while the latest Generation is still pending", async () => {
    const { deps, del, deletePhoto } = makeDeps({
      userId: "user-1",
      versions: [{ s3Key: "v1.webp" }],
      generations: [{ status: "pending" }],
    });

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({
      ok: false,
      errorCode: "ERR_GENERATION_IN_PROGRESS",
    });
    expect(deletePhoto).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes a picture whose last Generation failed", async () => {
    const { deps, del } = makeDeps({
      userId: "user-1",
      versions: [],
      generations: [{ status: "failed" }],
    });

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith({ where: { id: "fp1" } });
  });

  it("still deletes the row when an image delete fails, so nothing is stranded", async () => {
    const { deps, del, deletePhoto } = makeDeps({
      userId: "user-1",
      versions: [{ s3Key: "v1.webp" }, { s3Key: "v2.webp" }],
      generations: [{ status: "succeeded" }],
    });
    deletePhoto.mockRejectedValueOnce(new Error("S3 unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteFamilyPicture(deps, target)).resolves.toEqual({ ok: true });

    expect(deletePhoto).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith({ where: { id: "fp1" } });

    consoleErrorSpy.mockRestore();
  });

  it("scopes the lookup to the picture's own tree id", async () => {
    const { deps, findFirst } = makeDeps({
      userId: "user-1",
      versions: [],
      generations: [{ status: "succeeded" }],
    });

    await deleteFamilyPicture(deps, target);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "fp1", treeId: "t1" } }),
    );
  });
});
