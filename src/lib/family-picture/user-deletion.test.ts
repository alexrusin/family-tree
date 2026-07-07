import { describe, expect, it, vi } from "vitest";
import { deleteFamilyPictureImagesForUser } from "./user-deletion";

describe("deleteFamilyPictureImagesForUser", () => {
  it("deletes every S3 key belonging to the user's Family Picture Versions", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { s3Key: "users/u1/family-pictures/fp1/v1.webp" },
      { s3Key: "users/u1/family-pictures/fp1/v2.webp" },
      { s3Key: "users/u1/family-pictures/fp2/v1.webp" },
    ]);
    const deletePhoto = vi.fn().mockResolvedValue(undefined);

    await deleteFamilyPictureImagesForUser(
      { prisma: { familyPictureVersion: { findMany } }, deletePhoto },
      "u1",
    );

    expect(findMany).toHaveBeenCalledWith({
      where: { familyPicture: { userId: "u1" } },
      select: { s3Key: true },
    });
    expect(deletePhoto).toHaveBeenCalledTimes(3);
    expect(deletePhoto).toHaveBeenCalledWith("users/u1/family-pictures/fp1/v1.webp");
    expect(deletePhoto).toHaveBeenCalledWith("users/u1/family-pictures/fp1/v2.webp");
    expect(deletePhoto).toHaveBeenCalledWith("users/u1/family-pictures/fp2/v1.webp");
  });

  it("does nothing when the user has no Family Pictures", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const deletePhoto = vi.fn();

    await deleteFamilyPictureImagesForUser(
      { prisma: { familyPictureVersion: { findMany } }, deletePhoto },
      "u-none",
    );

    expect(deletePhoto).not.toHaveBeenCalled();
  });

  it("swallows a failed S3 delete and still attempts the rest", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { s3Key: "users/u1/family-pictures/fp1/v1.webp" },
      { s3Key: "users/u1/family-pictures/fp1/v2.webp" },
    ]);
    const deletePhoto = vi
      .fn()
      .mockRejectedValueOnce(new Error("S3 unavailable"))
      .mockResolvedValueOnce(undefined);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      deleteFamilyPictureImagesForUser(
        { prisma: { familyPictureVersion: { findMany } }, deletePhoto },
        "u1",
      ),
    ).resolves.toBeUndefined();

    expect(deletePhoto).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete Family Picture image for deleted user",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
