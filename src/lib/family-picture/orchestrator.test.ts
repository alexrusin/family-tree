import { describe, expect, it, vi } from "vitest";
import { runFamilyPictureGeneration, type OrchestratorDeps } from "./orchestrator";

function makeDeps(overrides: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    imageClient: {
      generate: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    },
    downloadReferenceImage: vi.fn().mockResolvedValue(new Uint8Array([9])),
    uploadVersionImage: vi.fn().mockResolvedValue(undefined),
    nextVersionNumber: vi.fn().mockResolvedValue(1),
    buildVersionKey: vi.fn().mockReturnValue("users/u1/family-pictures/fp1/v1.webp"),
    createVersion: vi.fn().mockResolvedValue(undefined),
    markSucceeded: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const job = {
  generationId: "gen1",
  familyPictureId: "fp1",
  userId: "u1",
  referencePhotoKeys: ["trees/t1/members/m1.webp", "trees/t1/members/m2.webp"],
  stylePreset: "bw" as const,
  setting: { preset: "garden" as const },
  personalTouch: "add a birthday cake",
};

describe("runFamilyPictureGeneration", () => {
  it("happy path: fetches references, generates, stores, writes a Version, and marks succeeded", async () => {
    const deps = makeDeps();

    await runFamilyPictureGeneration(deps, job);

    expect(deps.downloadReferenceImage).toHaveBeenCalledTimes(2);
    expect(deps.imageClient.generate).toHaveBeenCalledWith(
      [new Uint8Array([9]), new Uint8Array([9])],
      expect.stringContaining("add a birthday cake"),
    );
    expect(deps.uploadVersionImage).toHaveBeenCalledWith(
      "users/u1/family-pictures/fp1/v1.webp",
      new Uint8Array([1, 2, 3]),
    );
    expect(deps.createVersion).toHaveBeenCalledWith({
      familyPictureId: "fp1",
      generationId: "gen1",
      s3Key: "users/u1/family-pictures/fp1/v1.webp",
      versionNumber: 1,
    });
    expect(deps.markSucceeded).toHaveBeenCalledWith("gen1");
    expect(deps.markFailed).not.toHaveBeenCalled();
  });

  it("failure path: an image client error marks the Generation failed and writes nothing", async () => {
    const deps = makeDeps({
      imageClient: {
        generate: vi.fn().mockRejectedValue(new Error("provider declined")),
      },
    });

    await runFamilyPictureGeneration(deps, job);

    expect(deps.uploadVersionImage).not.toHaveBeenCalled();
    expect(deps.createVersion).not.toHaveBeenCalled();
    expect(deps.markSucceeded).not.toHaveBeenCalled();
    expect(deps.markFailed).toHaveBeenCalledWith("gen1", "provider declined");
  });

  it("failure path: a storage error also marks the Generation failed, not succeeded", async () => {
    const deps = makeDeps({
      uploadVersionImage: vi.fn().mockRejectedValue(new Error("S3 unavailable")),
    });

    await runFamilyPictureGeneration(deps, job);

    expect(deps.createVersion).not.toHaveBeenCalled();
    expect(deps.markSucceeded).not.toHaveBeenCalled();
    expect(deps.markFailed).toHaveBeenCalledWith("gen1", "S3 unavailable");
  });
});
