import { describe, expect, it } from "vitest";
import {
  FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH,
  SETTING_PRESETS,
  STYLE_PRESETS,
  isSettingPresetId,
  isStylePresetId,
} from "./preset-catalog";

describe("preset catalog", () => {
  it("accepts every catalog id as valid", () => {
    for (const preset of STYLE_PRESETS) {
      expect(isStylePresetId(preset.id)).toBe(true);
    }
    for (const preset of SETTING_PRESETS) {
      expect(isSettingPresetId(preset.id)).toBe(true);
    }
  });

  it("rejects ids outside the catalog", () => {
    expect(isStylePresetId("charcoal-sketch")).toBe(false);
    expect(isSettingPresetId("custom")).toBe(false);
  });

  it("caps free text at 150 characters", () => {
    expect(FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH).toBe(150);
  });
});
