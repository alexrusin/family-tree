import { BadRequestError, RateLimitError, type OpenAI } from "openai";
import type { ImagesResponse } from "openai/resources/images";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFamilyPictureImageClient,
  ImageGenerationBillingError,
  ImageGenerationProviderError,
  ImageGenerationRefusedError,
  resolveGptImageModel,
} from "./image-client";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function fakeResponse(b64: string): ImagesResponse {
  return {
    created: 0,
    data: [{ b64_json: b64 }],
  };
}

function fakeClient(edit: ReturnType<typeof vi.fn>): Pick<OpenAI, "images"> {
  return { images: { edit } as unknown as OpenAI["images"] };
}

describe("resolveGptImageModel", () => {
  it("defaults to the spike-tested model id", () => {
    delete process.env.OPENAI_IMAGE_MODEL;
    expect(resolveGptImageModel()).toBe("gpt-image-2");
  });

  it("prefers OPENAI_IMAGE_MODEL when configured", () => {
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-2-2026-04-21";
    expect(resolveGptImageModel()).toBe("gpt-image-2-2026-04-21");
  });
});

describe("generate", () => {
  it("sends the reference images and prompt, and returns decoded image bytes", async () => {
    const expectedBytes = Buffer.from("fake-png-bytes");
    const edit = vi.fn().mockResolvedValue(
      fakeResponse(expectedBytes.toString("base64")),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    const result = await client.generate(
      [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
      "a warm family portrait",
      "landscape",
    );

    expect(Buffer.from(result)).toEqual(expectedBytes);
    expect(edit).toHaveBeenCalledTimes(1);
    const body = edit.mock.calls[0][0];
    expect(body.model).toBe("gpt-image-test");
    expect(body.prompt).toBe("a warm family portrait");
    expect(body.size).toBe("1536x1024");
    expect(body.output_format).toBe("jpeg");
    expect(Array.isArray(body.image)).toBe(true);
    expect(body.image).toHaveLength(2);
  });

  it("maps portrait orientation to the 2:3 provider size", async () => {
    const edit = vi.fn().mockResolvedValue(
      fakeResponse(Buffer.from("x").toString("base64")),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await client.generate([new Uint8Array([1])], "prompt", "portrait");

    expect(edit.mock.calls[0][0].size).toBe("1024x1536");
  });

  it("maps square orientation to the 1:1 provider size", async () => {
    const edit = vi.fn().mockResolvedValue(
      fakeResponse(Buffer.from("x").toString("base64")),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await client.generate([new Uint8Array([1])], "prompt", "square");

    expect(edit.mock.calls[0][0].size).toBe("1024x1024");
  });
});

describe("tweak", () => {
  it("sends the base image alone (no crops) and returns decoded image bytes", async () => {
    const expectedBytes = Buffer.from("tweaked-bytes");
    const edit = vi.fn().mockResolvedValue(
      fakeResponse(expectedBytes.toString("base64")),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    const result = await client.tweak(
      new Uint8Array([9, 9, 9]),
      [],
      "make it sunset",
      "landscape",
    );

    expect(Buffer.from(result)).toEqual(expectedBytes);
    expect(edit).toHaveBeenCalledTimes(1);
    const body = edit.mock.calls[0][0];
    expect(body.prompt).toBe("make it sunset");
    expect(body.size).toBe("1536x1024");
    expect(body.output_format).toBe("jpeg");
    // With no crops this stays a single-image edit.
    expect(Array.isArray(body.image)).toBe(false);
  });

  it("leads with the base image and appends the face crops as references", async () => {
    const edit = vi.fn().mockResolvedValue(fakeResponse(Buffer.from("x").toString("base64")));
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await client.tweak(
      new Uint8Array([9]),
      [new Uint8Array([1]), new Uint8Array([2])],
      "make it sunset",
      "landscape",
    );

    const body = edit.mock.calls[0][0];
    // Base Version first (the image being edited), then one entry per crop.
    expect(Array.isArray(body.image)).toBe(true);
    expect(body.image).toHaveLength(3);
  });

  it("maps portrait orientation to the 2:3 provider size on tweak", async () => {
    const edit = vi.fn().mockResolvedValue(fakeResponse(Buffer.from("x").toString("base64")));
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await client.tweak(new Uint8Array([9]), [], "make it sunset", "portrait");

    expect(edit.mock.calls[0][0].size).toBe("1024x1536");
  });

  it("maps square orientation to the 1:1 provider size on tweak", async () => {
    const edit = vi.fn().mockResolvedValue(fakeResponse(Buffer.from("x").toString("base64")));
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await client.tweak(new Uint8Array([9]), [], "make it sunset", "square");

    expect(edit.mock.calls[0][0].size).toBe("1024x1024");
  });
});

describe("typed failures", () => {
  it("surfaces a content policy refusal as ImageGenerationRefusedError", async () => {
    const edit = vi.fn().mockRejectedValue(
      new BadRequestError(
        400,
        { code: "content_policy_violation", message: "blocked" },
        "blocked",
        new Headers(),
      ),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await expect(
      client.generate([new Uint8Array([1])], "prompt", "landscape"),
    ).rejects.toBeInstanceOf(ImageGenerationRefusedError);
  });

  it("surfaces a rate limit / quota error as ImageGenerationBillingError", async () => {
    const edit = vi.fn().mockRejectedValue(
      new RateLimitError(
        429,
        { code: "insufficient_quota", message: "no credit" },
        "no credit",
        new Headers(),
      ),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await expect(
      client.tweak(new Uint8Array([1]), [], "instruction", "landscape"),
    ).rejects.toBeInstanceOf(ImageGenerationBillingError);
  });

  it("surfaces a billing error code even outside a 429 status", async () => {
    const edit = vi.fn().mockRejectedValue(
      new BadRequestError(
        400,
        { code: "billing_hard_limit_reached", message: "hard limit" },
        "hard limit",
        new Headers(),
      ),
    );
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await expect(
      client.generate([new Uint8Array([1])], "prompt", "landscape"),
    ).rejects.toBeInstanceOf(ImageGenerationBillingError);
  });

  it("falls back to a generic provider error for anything unclassified", async () => {
    const edit = vi.fn().mockRejectedValue(new Error("network exploded"));
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await expect(
      client.generate([new Uint8Array([1])], "prompt", "landscape"),
    ).rejects.toBeInstanceOf(ImageGenerationProviderError);
  });

  it("treats a response with no image data as a provider error", async () => {
    const edit = vi.fn().mockResolvedValue({ created: 0, data: [] });
    const client = createFamilyPictureImageClient(fakeClient(edit), "gpt-image-test");

    await expect(
      client.generate([new Uint8Array([1])], "prompt", "landscape"),
    ).rejects.toBeInstanceOf(ImageGenerationProviderError);
  });
});
