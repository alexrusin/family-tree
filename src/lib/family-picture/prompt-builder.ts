export type StylePresetId = "realistic" | "bw" | "oil" | "sepia";

export type SettingPresetId =
  | "studio"
  | "garden"
  | "holiday"
  | "vintage"
  | "beach"
  | "park";

/**
 * Either a fixed setting preset or a custom place (per ADR 0008). Callers
 * must server-validate `place` (length + content guard) before this module
 * ever sees it.
 */
export type Setting = { preset: SettingPresetId } | { place: string };

// Placeholder copy pending the "Preset catalog & model id" (HITL) decision;
// this module is where the final copy will land.
const STYLE_PRESET_PHRASES: Record<StylePresetId, string> = {
  realistic: "a realistic photo with true-to-life color",
  bw: "a black-and-white film photo, timeless and grainy",
  oil: "an oil painting with painterly texture",
  sepia: "a sepia-toned heirloom photo with a warm, aged tone",
};

const SETTING_PRESET_PHRASES: Record<SettingPresetId, string> = {
  studio: "in a classic studio portrait backdrop",
  garden: "in a garden among blossoms and greenery",
  holiday: "gathered at a holiday table set for a meal",
  vintage: "at the old family homestead",
  beach: "on a seaside coast at golden hour",
  park: "in a park amid warm autumn foliage",
};

function settingPhrase(setting: Setting): string {
  return "preset" in setting
    ? SETTING_PRESET_PHRASES[setting.preset]
    : setting.place.trim();
}

/**
 * Builds the final text prompt sent to the image model from the user's
 * structured choices. The single place preset ids map to prompt language, so
 * prompt tuning lives in one testable unit. `setting` is either a preset id or
 * a custom place string (ADR 0008); `personalTouch` is the optional short
 * free text. Both free-text inputs are assumed already server-validated
 * (length + content guard) by the caller.
 */
export function buildFamilyPicturePrompt(
  stylePreset: StylePresetId,
  setting: Setting,
  personalTouch?: string | null,
): string {
  const sentences = [
    `A warm family portrait, ${settingPhrase(setting)}, rendered as ${STYLE_PRESET_PHRASES[stylePreset]}.`,
    "Preserve each person's facial identity and likeness exactly as shown in their reference photos.",
  ];

  const touch = personalTouch?.trim();
  if (touch) {
    sentences.push(`Personal touch: ${touch}.`);
  }

  return sentences.join(" ");
}
