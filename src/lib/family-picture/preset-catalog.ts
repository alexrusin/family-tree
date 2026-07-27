import type { SettingPresetId, StylePresetId } from "./prompt-builder";
import type { Orientation } from "./image-client";

export interface PresetOption<Id extends string> {
  id: Id;
  label: string;
  sub: string;
}

/**
 * Finalized style & setting catalog (issue 06). Ids and phrasing must stay in
 * lockstep with `prompt-builder.ts`'s phrase maps — this module is the
 * display layer (label/sub shown in the picker), that one is the prompt-text
 * layer.
 */
export const STYLE_PRESETS: PresetOption<StylePresetId>[] = [
  { id: "realistic", label: "Realistic photo", sub: "True-to-life color" },
  { id: "bw", label: "B&W film", sub: "Timeless & grainy" },
  { id: "oil", label: "Oil painting", sub: "Painterly texture" },
  { id: "sepia", label: "Sepia heirloom", sub: "Aged warm tone" },
];

export const SETTING_PRESETS: PresetOption<SettingPresetId>[] = [
  { id: "studio", label: "Studio", sub: "Classic backdrop" },
  { id: "garden", label: "Garden", sub: "Blossoms & greenery" },
  { id: "holiday", label: "Holiday table", sub: "Gathered for a meal" },
  { id: "vintage", label: "Old homestead", sub: "By the family house" },
  { id: "beach", label: "Seaside", sub: "Coast at golden hour" },
  { id: "park", label: "Autumn park", sub: "Warm foliage" },
];

const STYLE_PRESET_IDS = new Set<string>(STYLE_PRESETS.map((p) => p.id));
const SETTING_PRESET_IDS = new Set<string>(SETTING_PRESETS.map((p) => p.id));

export function isStylePresetId(value: string): value is StylePresetId {
  return STYLE_PRESET_IDS.has(value);
}

export function isSettingPresetId(value: string): value is SettingPresetId {
  return SETTING_PRESET_IDS.has(value);
}

const ORIENTATIONS = new Set<string>(["landscape", "portrait", "square"]);

export function isOrientation(value: string): value is Orientation {
  return ORIENTATIONS.has(value);
}

/** Server-validation cap for both free-text fields (custom place, personal touch). */
export const FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH = 150;
