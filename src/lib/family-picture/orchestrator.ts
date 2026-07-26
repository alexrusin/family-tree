import {
  buildFamilyPicturePrompt,
  buildFamilyPictureTweakPrompt,
  type Setting,
} from "./prompt-builder";
import type { ImageBytes, ImageClient, Orientation } from "./image-client";
import type { StylePresetId } from "./prompt-builder";

/** Everything the orchestrator needs to know about the Generation it's running. */
export interface GenerationJob {
  generationId: string;
  familyPictureId: string;
  userId: string;
  referencePhotoKeys: string[];
  stylePreset: StylePresetId;
  setting: Setting;
  personalTouch: string | null;
  orientation: Orientation;
}

/** Everything the orchestrator needs to know about the tweak Generation it's running. */
export interface TweakJob {
  generationId: string;
  familyPictureId: string;
  userId: string;
  /** S3 key of the Version being refined (the "prior version fed back in" per ADR 0007). */
  baseImageKey: string;
  /**
   * S3 keys of the depicted Members' Profile Photos, re-supplied alongside the
   * base image to reinforce likeness on the tweak (PRD story 17). Supplementary
   * to the base Version, which already anchors the composition — so downloads
   * are best-effort and a missing crop just drops out.
   */
  referencePhotoKeys: string[];
  instruction: string;
  /** Sourced from the stored Family Picture, never from the tweak request — Orientation is locked at creation. */
  orientation: Orientation;
}

/**
 * Persistence/metering seams shared by both a fresh generation and a tweak:
 * once an `ImageBytes` result exists, writing the Version and settling the
 * allowance reservation is identical either way.
 */
export interface VersionPersistenceDeps {
  uploadVersionImage: (key: string, bytes: ImageBytes) => Promise<void>;
  nextVersionNumber: (familyPictureId: string) => Promise<number>;
  buildVersionKey: (familyPictureId: string, versionNumber: number) => string;
  createVersion: (input: {
    familyPictureId: string;
    generationId: string;
    s3Key: string;
    versionNumber: number;
  }) => Promise<void>;
  markSucceeded: (generationId: string) => Promise<void>;
  markFailed: (generationId: string, errorMessage: string) => Promise<void>;
  /** Converts the Generation's already-open allowance reservation into a consumption. */
  consumeAllowance: (generationId: string) => Promise<void>;
  /** Releases the Generation's already-open allowance reservation (never charge for a result the user didn't get). */
  refundAllowance: (generationId: string) => Promise<void>;
}

/**
 * Narrow seams the orchestrator depends on — deliberately not the Prisma
 * client or the real S3 SDK, so tests can supply fakes for the image client
 * and storage (per the PRD's testing decision) without touching a database
 * or network.
 */
export interface OrchestratorDeps extends VersionPersistenceDeps {
  imageClient: Pick<ImageClient, "generate">;
  downloadReferenceImage: (key: string) => Promise<ImageBytes>;
}

/** Same seams as `OrchestratorDeps`, but for the `tweak` image-client path. */
export interface TweakOrchestratorDeps extends VersionPersistenceDeps {
  imageClient: Pick<ImageClient, "tweak">;
  downloadBaseImage: (key: string) => Promise<ImageBytes>;
  downloadReferenceImage: (key: string) => Promise<ImageBytes>;
}

async function persistSuccessfulVersion(
  deps: VersionPersistenceDeps,
  familyPictureId: string,
  generationId: string,
  imageBytes: ImageBytes,
): Promise<void> {
  const versionNumber = await deps.nextVersionNumber(familyPictureId);
  const s3Key = deps.buildVersionKey(familyPictureId, versionNumber);
  await deps.uploadVersionImage(s3Key, imageBytes);

  await deps.createVersion({
    familyPictureId,
    generationId,
    s3Key,
    versionNumber,
  });

  await deps.consumeAllowance(generationId);
  await deps.markSucceeded(generationId);
}

async function failGeneration(
  deps: VersionPersistenceDeps,
  generationId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown error";
  await deps.refundAllowance(generationId);
  await deps.markFailed(generationId, message);
}

/**
 * Runs one Generation end to end: fetch reference photos → build the prompt
 * → call the image client → store the result → write the Version → mark the
 * Generation succeeded. Any failure (image client, storage, or downstream)
 * marks the Generation failed with the error message instead of throwing, so
 * callers can fire this without awaiting it.
 */
export async function runFamilyPictureGeneration(
  deps: OrchestratorDeps,
  job: GenerationJob,
): Promise<void> {
  try {
    const referenceImages = await Promise.all(
      job.referencePhotoKeys.map((key) => deps.downloadReferenceImage(key)),
    );

    const prompt = buildFamilyPicturePrompt(
      job.stylePreset,
      job.setting,
      job.personalTouch,
    );

    const imageBytes = await deps.imageClient.generate(
      referenceImages,
      prompt,
      job.orientation,
    );
    await persistSuccessfulVersion(
      deps,
      job.familyPictureId,
      job.generationId,
      imageBytes,
    );
  } catch (error) {
    await failGeneration(deps, job.generationId, error);
  }
}

/**
 * Runs one tweak Generation end to end: fetch the Version being refined →
 * call the image client's `tweak` with the free-text instruction → store the
 * result → write the new Version → mark the Generation succeeded. Mirrors
 * `runFamilyPictureGeneration`'s failure handling (refund + mark failed
 * instead of throwing) so callers can fire this without awaiting it.
 */
export async function runFamilyPictureTweak(
  deps: TweakOrchestratorDeps,
  job: TweakJob,
): Promise<void> {
  try {
    const baseImage = await deps.downloadBaseImage(job.baseImageKey);
    // Re-supply the members' face crops as extra likeness references. They're
    // supplementary to the base Version, so a crop that no longer downloads
    // (Member deleted, Profile Photo rotated) drops out rather than failing
    // the whole tweak.
    const referenceImages = (
      await Promise.all(
        job.referencePhotoKeys.map((key) =>
          deps.downloadReferenceImage(key).then(
            (bytes) => bytes,
            () => null,
          ),
        ),
      )
    ).filter((bytes): bytes is ImageBytes => bytes !== null);
    const prompt = buildFamilyPictureTweakPrompt(job.instruction);
    const imageBytes = await deps.imageClient.tweak(
      baseImage,
      referenceImages,
      prompt,
      job.orientation,
    );
    await persistSuccessfulVersion(
      deps,
      job.familyPictureId,
      job.generationId,
      imageBytes,
    );
  } catch (error) {
    await failGeneration(deps, job.generationId, error);
  }
}
