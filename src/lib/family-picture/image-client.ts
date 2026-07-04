import OpenAI, { APIError, RateLimitError, toFile } from "openai";
import type { ImagesResponse } from "openai/resources/images";

export type ImageBytes = Uint8Array;

/**
 * The provider declined the request outright (content policy / moderation).
 * The orchestrator should refund the Generation reservation, not retry.
 */
export class ImageGenerationRefusedError extends Error {
  constructor(message = "The image provider declined this request.") {
    super(message);
    this.name = "ImageGenerationRefusedError";
  }
}

/** The provider rejected the request for account billing/quota reasons. */
export class ImageGenerationBillingError extends Error {
  constructor(
    message = "The image provider rejected the request for billing or quota reasons.",
  ) {
    super(message);
    this.name = "ImageGenerationBillingError";
  }
}

/** Any other provider/transport failure not classified above. */
export class ImageGenerationProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ImageGenerationProviderError";
  }
}

/**
 * Stable seam between the feature and the image provider. Only this module
 * may import the `openai` SDK; the rest of the system depends on this
 * interface so the spike-decided provider (ADR 0007) can be swapped later.
 */
export interface ImageClient {
  generate(referenceImages: ImageBytes[], prompt: string): Promise<ImageBytes>;
  tweak(baseImage: ImageBytes, instruction: string): Promise<ImageBytes>;
}

// Spike (ADR 0007) ran `gpt-image-2`. The exact live id is a build-time HITL
// decision (issue 06-preset-catalog-and-model-id); OPENAI_IMAGE_MODEL lets
// that decision land as configuration instead of a code change.
const SPIKE_MODEL_ID = "gpt-image-2";
const OUTPUT_SIZE = "1024x1024";

const REFUSAL_ERROR_CODES = new Set([
  "content_policy_violation",
  "moderation_blocked",
  "image_generation_user_error",
]);

const BILLING_ERROR_CODES = new Set([
  "insufficient_quota",
  "billing_hard_limit_reached",
  "billing_not_active",
]);

export function resolveGptImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL ?? SPIKE_MODEL_ID;
}

export function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function toTypedFailure(error: unknown): Error {
  if (error instanceof RateLimitError) {
    return new ImageGenerationBillingError(error.message);
  }

  if (error instanceof APIError && typeof error.code === "string") {
    if (REFUSAL_ERROR_CODES.has(error.code)) {
      return new ImageGenerationRefusedError(error.message);
    }
    if (BILLING_ERROR_CODES.has(error.code)) {
      return new ImageGenerationBillingError(error.message);
    }
  }

  return new ImageGenerationProviderError(
    error instanceof Error ? error.message : String(error),
    error,
  );
}

function toUploadableImage(image: ImageBytes, name: string) {
  return toFile(image, name, { type: "image/png" });
}

function extractImageBytes(response: ImagesResponse): ImageBytes {
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new ImageGenerationProviderError(
      "The image provider returned no image data.",
    );
  }

  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * OpenAI `gpt-image` adapter (ADR 0007). `client` is injected so tests can
 * supply a fake `images.edit` without reaching the network or importing the
 * real SDK class.
 */
export function createFamilyPictureImageClient(
  client: Pick<OpenAI, "images">,
  model: string = resolveGptImageModel(),
): ImageClient {
  return {
    async generate(referenceImages, prompt) {
      try {
        const images = await Promise.all(
          referenceImages.map((image, index) =>
            toUploadableImage(image, `reference-${index}.png`),
          ),
        );
        const response = await client.images.edit({
          model,
          image: images,
          prompt,
          size: OUTPUT_SIZE,
          output_format: "webp",
        });
        return extractImageBytes(response);
      } catch (error) {
        throw toTypedFailure(error);
      }
    },

    async tweak(baseImage, instruction) {
      try {
        const image = await toUploadableImage(baseImage, "base.png");
        const response = await client.images.edit({
          model,
          image,
          prompt: instruction,
          size: OUTPUT_SIZE,
          output_format: "webp",
        });
        return extractImageBytes(response);
      } catch (error) {
        throw toTypedFailure(error);
      }
    },
  };
}
