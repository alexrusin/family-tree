/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoCropModal, { type PhotoCropModalT } from "./PhotoCropModal";
import * as cropImage from "@/lib/crop-image";

vi.mock("react-easy-crop", () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete?: (
      area: { x: number; y: number; width: number; height: number },
      areaPixels: { x: number; y: number; width: number; height: number },
    ) => void;
  }) => {
    const area = { x: 0, y: 0, width: 100, height: 100 };
    return (
      <button type="button" onClick={() => onCropComplete?.(area, area)}>
        Mock Cropper
      </button>
    );
  },
}));

const translations: PhotoCropModalT = {
  title: "Crop Photo",
  instructions: "Drag to reposition and use the slider to zoom.",
  zoomLabel: "Zoom",
  apply: "Apply",
  cancel: "Cancel",
  closeModal: "Close crop editor",
  processing: "Processing...",
  error: "Unable to process this photo. Please try again.",
};

describe("PhotoCropModal", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    // The modal pre-decodes the source bitmap before rendering the Cropper.
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the editor for a source file", async () => {
    const file = new File(["source"], "group.png", { type: "image/png" });

    render(
      <PhotoCropModal
        isOpen
        sourceFile={file}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        t={translations}
      />,
    );

    expect(screen.getByText("Crop Photo")).not.toBeNull();
    expect(
      await screen.findByRole("button", { name: "Mock Cropper" }),
    ).not.toBeNull();
  });

  it("still renders the editor when decode() rejects", async () => {
    HTMLImageElement.prototype.decode = vi
      .fn()
      .mockRejectedValue(new Error("decode failed"));
    const file = new File(["source"], "group.png", { type: "image/png" });

    render(
      <PhotoCropModal
        isOpen
        sourceFile={file}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        t={translations}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "Mock Cropper" }),
    ).not.toBeNull();
  });

  it("calls onApply with a cropped File when Apply is clicked", async () => {
    const user = userEvent.setup();
    const file = new File(["source"], "group.png", { type: "image/png" });
    const croppedFile = new File(["cropped"], "group.jpg", {
      type: "image/jpeg",
    });
    vi.spyOn(cropImage, "getCroppedBlob").mockResolvedValue(
      new Blob(["cropped"], { type: "image/jpeg" }),
    );
    vi.spyOn(cropImage, "blobToPhotoFile").mockReturnValue(croppedFile);

    const onApply = vi.fn();
    render(
      <PhotoCropModal
        isOpen
        sourceFile={file}
        onApply={onApply}
        onCancel={vi.fn()}
        t={translations}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Mock Cropper" }),
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(croppedFile);
  });

  it("calls onCancel and stages nothing when cancelled", async () => {
    const user = userEvent.setup();
    const file = new File(["source"], "group.png", { type: "image/png" });
    const onApply = vi.fn();
    const onCancel = vi.fn();

    render(
      <PhotoCropModal
        isOpen
        sourceFile={file}
        onApply={onApply}
        onCancel={onCancel}
        t={translations}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("renders nothing when isOpen is false", () => {
    const file = new File(["source"], "group.png", { type: "image/png" });

    render(
      <PhotoCropModal
        isOpen={false}
        sourceFile={file}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        t={translations}
      />,
    );

    expect(screen.queryByText("Crop Photo")).toBeNull();
  });
});
