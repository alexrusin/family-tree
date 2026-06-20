import { describe, it, expect } from "vitest";
import {
  resolvePhotoIntent,
  applyPhotoIntentToFormData,
} from "./photo-intent";

describe("photo-intent", () => {
  describe("resolvePhotoIntent", () => {
    it("returns unchanged when no file and no pending remove", () => {
      expect(resolvePhotoIntent(null, false)).toEqual({ kind: "unchanged" });
    });

    it("returns replace when a file is selected", () => {
      const file = new File(["data"], "photo.png", { type: "image/png" });
      const intent = resolvePhotoIntent(file, false);
      expect(intent).toEqual({ kind: "replace", file });
    });

    it("returns remove when pending remove is set and no file", () => {
      expect(resolvePhotoIntent(null, true)).toEqual({ kind: "remove" });
    });

    it("replace wins over remove when both are set", () => {
      const file = new File(["data"], "photo.png", { type: "image/png" });
      const intent = resolvePhotoIntent(file, true);
      expect(intent).toEqual({ kind: "replace", file });
    });
  });

  describe("applyPhotoIntentToFormData", () => {
    it("appends photo file for replace intent", () => {
      const body = new FormData();
      const file = new File(["data"], "photo.png", { type: "image/png" });
      applyPhotoIntentToFormData(body, { kind: "replace", file });
      expect(body.get("photo")).toBe(file);
      expect(body.get("removePhoto")).toBeNull();
    });

    it("appends removePhoto flag for remove intent", () => {
      const body = new FormData();
      applyPhotoIntentToFormData(body, { kind: "remove" });
      expect(body.get("removePhoto")).toBe("true");
      expect(body.get("photo")).toBeNull();
    });

    it("appends nothing for unchanged intent", () => {
      const body = new FormData();
      applyPhotoIntentToFormData(body, { kind: "unchanged" });
      expect(body.get("photo")).toBeNull();
      expect(body.get("removePhoto")).toBeNull();
    });
  });
});
