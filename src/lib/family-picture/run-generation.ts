import "server-only";
import { prisma } from "@/lib/prisma";
import {
  createS3Client,
  downloadPhotoByKey,
  uploadProcessedPhoto,
} from "@/lib/tree-domain/photo-upload";
import {
  createFamilyPictureImageClient,
  createOpenAIClient,
} from "./image-client";
import { generateFamilyPictureVersionKey } from "./storage";
import {
  runFamilyPictureGeneration,
  type GenerationJob,
  type OrchestratorDeps,
} from "./orchestrator";

/**
 * Server-only adapter wiring the pure orchestrator to the real Prisma
 * client, S3, and OpenAI image client. Kept separate from `orchestrator.ts`
 * so that module stays free of Node/network dependencies and testable with
 * fakes.
 */
export async function processFamilyPictureGeneration(
  job: GenerationJob,
): Promise<void> {
  const bucket = process.env.S3_BUCKET ?? "";
  const s3Client = createS3Client();
  const imageClient = createFamilyPictureImageClient(createOpenAIClient());

  const deps: OrchestratorDeps = {
    imageClient,
    downloadReferenceImage: async (key) => {
      const photo = await downloadPhotoByKey({ s3Client, bucket, key });
      return photo.body;
    },
    uploadVersionImage: async (key, bytes) => {
      await uploadProcessedPhoto({
        s3Client,
        bucket,
        key,
        buffer: Buffer.from(bytes),
      });
    },
    nextVersionNumber: async (familyPictureId) => {
      const count = await prisma.familyPictureVersion.count({
        where: { familyPictureId },
      });
      return count + 1;
    },
    buildVersionKey: (familyPictureId, versionNumber) =>
      generateFamilyPictureVersionKey(job.userId, familyPictureId, versionNumber),
    createVersion: async ({ familyPictureId, generationId, s3Key, versionNumber }) => {
      await prisma.familyPictureVersion.create({
        data: { familyPictureId, generationId, s3Key, versionNumber },
      });
    },
    markSucceeded: async (generationId) => {
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: "succeeded" },
      });
    },
    markFailed: async (generationId, errorMessage) => {
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: "failed", errorMessage },
      });
    },
  };

  await runFamilyPictureGeneration(deps, job);
}
