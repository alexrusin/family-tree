import { describe, expect, it, vi } from "vitest";
import {
  runFamilyPictureGeneration,
  runFamilyPictureTweak,
  type OrchestratorDeps,
  type TweakOrchestratorDeps,
} from "./orchestrator";

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
    consumeAllowance: vi.fn().mockResolvedValue(undefined),
    refundAllowance: vi.fn().mockResolvedValue(undefined),
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
    expect(deps.consumeAllowance).toHaveBeenCalledWith("gen1");
    expect(deps.refundAllowance).not.toHaveBeenCalled();
  });

  it("failure path: an image client error marks the Generation failed, refunds the allowance, and writes nothing", async () => {
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
    expect(deps.refundAllowance).toHaveBeenCalledWith("gen1");
    expect(deps.consumeAllowance).not.toHaveBeenCalled();
  });

  it("failure path: a storage error also marks the Generation failed and refunds, not succeeds", async () => {
    const deps = makeDeps({
      uploadVersionImage: vi.fn().mockRejectedValue(new Error("S3 unavailable")),
    });

    await runFamilyPictureGeneration(deps, job);

    expect(deps.createVersion).not.toHaveBeenCalled();
    expect(deps.markSucceeded).not.toHaveBeenCalled();
    expect(deps.markFailed).toHaveBeenCalledWith("gen1", "S3 unavailable");
    expect(deps.refundAllowance).toHaveBeenCalledWith("gen1");
  });
});

function makeTweakDeps(
  overrides: Partial<TweakOrchestratorDeps> = {},
): TweakOrchestratorDeps {
  return {
    imageClient: {
      tweak: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    },
    downloadBaseImage: vi.fn().mockResolvedValue(new Uint8Array([9])),
    downloadReferenceImage: vi
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(new Uint8Array([key.length])),
      ),
    uploadVersionImage: vi.fn().mockResolvedValue(undefined),
    nextVersionNumber: vi.fn().mockResolvedValue(2),
    buildVersionKey: vi.fn().mockReturnValue("users/u1/family-pictures/fp1/v2.webp"),
    createVersion: vi.fn().mockResolvedValue(undefined),
    markSucceeded: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    consumeAllowance: vi.fn().mockResolvedValue(undefined),
    refundAllowance: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const tweakJob = {
  generationId: "gen2",
  familyPictureId: "fp1",
  userId: "u1",
  baseImageKey: "users/u1/family-pictures/fp1/v1.webp",
  referencePhotoKeys: ["trees/t1/members/m1.webp", "trees/t1/members/m2.webp"],
  instruction: "make it sunset",
};

describe("runFamilyPictureTweak", () => {
  it("happy path: fetches the base Version, tweaks, stores, writes a new Version, and marks succeeded", async () => {
    const deps = makeTweakDeps();

    await runFamilyPictureTweak(deps, tweakJob);

    expect(deps.downloadBaseImage).toHaveBeenCalledWith(
      "users/u1/family-pictures/fp1/v1.webp",
    );
    // Base Version, plus the members' downloaded face crops as likeness
    // references, plus the wrapped prompt (PRD story 17) — never the bare
    // instruction.
    expect(deps.downloadReferenceImage).toHaveBeenCalledWith("trees/t1/members/m1.webp");
    expect(deps.downloadReferenceImage).toHaveBeenCalledWith("trees/t1/members/m2.webp");
    expect(deps.imageClient.tweak).toHaveBeenCalledWith(
      new Uint8Array([9]),
      [new Uint8Array([24]), new Uint8Array([24])],
      expect.stringContaining("make it sunset"),
    );
    const tweakPrompt = vi.mocked(deps.imageClient.tweak).mock.calls[0][2];
    expect(tweakPrompt).toMatch(/likeness/i);
    expect(deps.uploadVersionImage).toHaveBeenCalledWith(
      "users/u1/family-pictures/fp1/v2.webp",
      new Uint8Array([4, 5, 6]),
    );
    expect(deps.createVersion).toHaveBeenCalledWith({
      familyPictureId: "fp1",
      generationId: "gen2",
      s3Key: "users/u1/family-pictures/fp1/v2.webp",
      versionNumber: 2,
    });
    expect(deps.markSucceeded).toHaveBeenCalledWith("gen2");
    expect(deps.markFailed).not.toHaveBeenCalled();
    expect(deps.consumeAllowance).toHaveBeenCalledWith("gen2");
    expect(deps.refundAllowance).not.toHaveBeenCalled();
  });

  it("failure path: an image client error marks the Generation failed, refunds the allowance, and writes nothing", async () => {
    const deps = makeTweakDeps({
      imageClient: {
        tweak: vi.fn().mockRejectedValue(new Error("provider declined")),
      },
    });

    await runFamilyPictureTweak(deps, tweakJob);

    expect(deps.uploadVersionImage).not.toHaveBeenCalled();
    expect(deps.createVersion).not.toHaveBeenCalled();
    expect(deps.markSucceeded).not.toHaveBeenCalled();
    expect(deps.markFailed).toHaveBeenCalledWith("gen2", "provider declined");
    expect(deps.refundAllowance).toHaveBeenCalledWith("gen2");
    expect(deps.consumeAllowance).not.toHaveBeenCalled();
  });

  it("failure path: a storage error also marks the Generation failed and refunds, not succeeds", async () => {
    const deps = makeTweakDeps({
      uploadVersionImage: vi.fn().mockRejectedValue(new Error("S3 unavailable")),
    });

    await runFamilyPictureTweak(deps, tweakJob);

    expect(deps.createVersion).not.toHaveBeenCalled();
    expect(deps.markSucceeded).not.toHaveBeenCalled();
    expect(deps.markFailed).toHaveBeenCalledWith("gen2", "S3 unavailable");
    expect(deps.refundAllowance).toHaveBeenCalledWith("gen2");
  });

  it("drops a face crop that fails to download and tweaks with the rest, not failing the Generation", async () => {
    const deps = makeTweakDeps({
      downloadReferenceImage: vi
        .fn()
        .mockRejectedValueOnce(new Error("crop gone"))
        .mockResolvedValueOnce(new Uint8Array([7])),
    });

    await runFamilyPictureTweak(deps, tweakJob);

    // Only the surviving crop reaches the model; the missing one is skipped.
    expect(deps.imageClient.tweak).toHaveBeenCalledWith(
      new Uint8Array([9]),
      [new Uint8Array([7])],
      expect.any(String),
    );
    expect(deps.markSucceeded).toHaveBeenCalledWith("gen2");
    expect(deps.markFailed).not.toHaveBeenCalled();
  });

  it("tweaks from the base image alone when no face crops are available", async () => {
    const deps = makeTweakDeps({
      downloadReferenceImage: vi.fn(),
    });

    await runFamilyPictureTweak(deps, { ...tweakJob, referencePhotoKeys: [] });

    expect(deps.downloadReferenceImage).not.toHaveBeenCalled();
    expect(deps.imageClient.tweak).toHaveBeenCalledWith(
      new Uint8Array([9]),
      [],
      expect.any(String),
    );
    expect(deps.markSucceeded).toHaveBeenCalledWith("gen2");
  });
});
