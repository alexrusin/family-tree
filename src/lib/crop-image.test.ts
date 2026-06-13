/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blobToPhotoFile, getCroppedBlob } from "./crop-image";

describe("getCroppedBlob", () => {
  let drawImageMock: ReturnType<typeof vi.fn>;
  let toBlobMock: ReturnType<typeof vi.fn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    drawImageMock = vi.fn();
    toBlobMock = vi.fn((cb: (blob: Blob | null) => void) => {
      cb(new Blob(["fake-image-bytes"], { type: "image/webp" }));
    });

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: drawImageMock,
      } as unknown as CanvasRenderingContext2D);

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      toBlobMock as unknown as HTMLCanvasElement["toBlob"],
    );

    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 0;
        height = 0;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
        addEventListener(event: "load" | "error", handler: () => void) {
          if (event === "load") this.onload = handler;
          if (event === "error") this.onerror = handler;
        }
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws the requested crop rectangle onto the canvas", async () => {
    const croppedAreaPixels = { x: 10, y: 20, width: 200, height: 200 };

    await getCroppedBlob("blob:source", croppedAreaPixels);

    expect(drawImageMock).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      200,
      200,
      0,
      0,
      200,
      200,
    );
  });

  it("downscales the output to the maximum edge of 1024px", async () => {
    const croppedAreaPixels = { x: 0, y: 0, width: 2000, height: 2000 };

    await getCroppedBlob("blob:source", croppedAreaPixels);

    expect(drawImageMock).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      2000,
      2000,
      0,
      0,
      1024,
      1024,
    );
  });

  it("rejects when the canvas cannot produce a blob", async () => {
    toBlobMock.mockImplementation((cb: (blob: Blob | null) => void) => {
      cb(null);
    });

    await expect(
      getCroppedBlob("blob:source", { x: 0, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow("ERR_CROP_FAILED");
  });

  it("rejects when the canvas context is unavailable", async () => {
    getContextSpy.mockReturnValue(null);

    await expect(
      getCroppedBlob("blob:source", { x: 0, y: 0, width: 100, height: 100 }),
    ).rejects.toThrow("ERR_CANVAS_UNAVAILABLE");
  });
});

describe("blobToPhotoFile", () => {
  it("wraps the blob as a webp File using the source base name", () => {
    const blob = new Blob(["fake-image-bytes"], { type: "image/webp" });

    const file = blobToPhotoFile(blob, "portrait.png");

    expect(file.name).toBe("portrait.webp");
    expect(file.type).toBe("image/webp");
  });

  it("handles source names without an extension", () => {
    const blob = new Blob(["fake-image-bytes"], { type: "image/webp" });

    const file = blobToPhotoFile(blob, "portrait");

    expect(file.name).toBe("portrait.webp");
  });
});
