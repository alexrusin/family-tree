import { buildFamilyPicturePrompt, type Setting } from "./prompt-builder";
import type { ImageBytes, ImageClient } from "./image-client";
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
}

/**
 * Narrow seams the orchestrator depends on — deliberately not the Prisma
 * client or the real S3 SDK, so tests can supply fakes for the image client
 * and storage (per the PRD's testing decision) without touching a database
 * or network.
 */
export interface OrchestratorDeps {
  imageClient: Pick<ImageClient, "generate">;
  downloadReferenceImage: (key: string) => Promise<ImageBytes>;
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

    const imageBytes = await deps.imageClient.generate(referenceImages, prompt);

    const versionNumber = await deps.nextVersionNumber(job.familyPictureId);
    const s3Key = deps.buildVersionKey(job.familyPictureId, versionNumber);
    await deps.uploadVersionImage(s3Key, imageBytes);

    await deps.createVersion({
      familyPictureId: job.familyPictureId,
      generationId: job.generationId,
      s3Key,
      versionNumber,
    });

    await deps.consumeAllowance(job.generationId);
    await deps.markSucceeded(job.generationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await deps.refundAllowance(job.generationId);
    await deps.markFailed(job.generationId, message);
  }
}
