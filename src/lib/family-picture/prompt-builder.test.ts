import { describe, expect, it } from "vitest";
import {
  buildFamilyPicturePrompt,
  buildFamilyPictureTweakPrompt,
  type SettingPresetId,
  type StylePresetId,
} from "./prompt-builder";

describe("buildFamilyPicturePrompt", () => {
  const settingPresets: SettingPresetId[] = [
    "studio",
    "garden",
    "holiday",
    "vintage",
    "beach",
    "park",
  ];
  const stylePresets: StylePresetId[] = ["realistic", "bw", "oil", "sepia"];

  it.each(settingPresets.flatMap((setting) => stylePresets.map((style) => [setting, style] as const)))(
    "produces the expected shape for setting=%s style=%s",
    (setting, style) => {
      const prompt = buildFamilyPicturePrompt(style, { preset: setting });

      expect(prompt.startsWith("A warm family portrait,")).toBe(true);
      expect(prompt).toContain("Preserve each person's facial identity and likeness");
      expect(prompt).not.toContain("Personal touch:");
    },
  );

  it("incorporates a custom place instead of a setting preset", () => {
    const prompt = buildFamilyPicturePrompt("realistic", {
      place: "Chicago — Millennium Park, beside the Bean",
    });

    expect(prompt).toContain("Chicago — Millennium Park, beside the Bean");
  });

  it("trims whitespace from a custom place", () => {
    const prompt = buildFamilyPicturePrompt("realistic", {
      place: "  the old homestead porch  ",
    });

    expect(prompt).toContain("the old homestead porch,");
    expect(prompt).not.toContain("  the old homestead porch  ");
  });

  it("appends the personal touch when present", () => {
    const prompt = buildFamilyPicturePrompt("bw", { preset: "garden" }, "add a birthday cake on the table");

    expect(prompt).toContain("Personal touch: add a birthday cake on the table.");
  });

  it("trims whitespace from the personal touch", () => {
    const prompt = buildFamilyPicturePrompt("bw", { preset: "garden" }, "  add a birthday cake  ");

    expect(prompt).toContain("Personal touch: add a birthday cake.");
  });

  it("omits the personal touch cleanly when absent", () => {
    const prompt = buildFamilyPicturePrompt("bw", { preset: "garden" });

    expect(prompt).not.toContain("Personal touch");
  });

  it("omits the personal touch cleanly when null", () => {
    const prompt = buildFamilyPicturePrompt("bw", { preset: "garden" }, null);

    expect(prompt).not.toContain("Personal touch");
  });

  it("omits the personal touch cleanly when blank", () => {
    const prompt = buildFamilyPicturePrompt("bw", { preset: "garden" }, "   ");

    expect(prompt).not.toContain("Personal touch");
  });

  it("is deterministic for the same inputs", () => {
    const a = buildFamilyPicturePrompt("oil", { preset: "beach" }, "a golden retriever in frame");
    const b = buildFamilyPicturePrompt("oil", { preset: "beach" }, "a golden retriever in frame");

    expect(a).toBe(b);
  });
});

describe("buildFamilyPictureTweakPrompt", () => {
  it("carries the user's instruction", () => {
    expect(buildFamilyPictureTweakPrompt("make it sunset")).toContain("make it sunset");
  });

  it("wraps every instruction with likeness-preservation language (story 17)", () => {
    const prompt = buildFamilyPictureTweakPrompt("add a birthday cake");

    expect(prompt).toMatch(/facial identity and likeness/i);
    expect(prompt).toMatch(/change only what the instruction asks/i);
  });

  it("trims surrounding whitespace from the instruction", () => {
    expect(buildFamilyPictureTweakPrompt("  make it sunset  ")).toContain(
      "portrait: make it sunset.",
    );
  });
});
