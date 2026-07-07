/**
 * Mandatory server-side content guard for the free-text that ADR 0008 opens
 * up — the custom place, the personal touch, and the tweak instruction. The
 * ADR requires both a length cap *and* a content guard on every free-text
 * surface *before* the value reaches the Prompt builder / image model, so this
 * runs in each route alongside the `FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH` check.
 *
 * It is a deliberately conservative, purely lexical guardrail sitting on top of
 * the hard length cap and the preset scaffolding — not a full moderation
 * system. It rejects two things ADR 0008 names: attempts to inject
 * style/instruction overrides (prompt injection), and disallowed-content terms.
 * The provider's own refusal behaviour remains the backstop (ADR 0007), and a
 * refused Generation is failed and refunded.
 */

export type ContentGuardResult =
  | { ok: true }
  | { ok: false; reason: "injection" | "disallowed" };

/**
 * Prompt-injection / instruction-override attempts: text trying to steer the
 * model away from the preset scaffolding rather than describe a place or an
 * added object. Word-boundary anchored to keep false positives off ordinary
 * place and object descriptions.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b[\s\S]{0,20}\b(all|any|the|previous|prior|above|earlier|preceding)\b/,
  /\bdisregard\b[\s\S]{0,20}\b(all|any|the|previous|prior|above|earlier|instructions?)\b/,
  /\bforget\b[\s\S]{0,20}\b(all|everything|the|previous|prior|above|earlier|instructions?)\b/,
  /\b(system|developer|assistant)\s+(prompt|message|instructions?)\b/,
  /\bnew\s+(instructions?|prompt|rules?)\b/,
  /\b(instead|rather)\s+(of\b|,)?[\s\S]{0,30}\b(draw|render|generate|make|create|produce|show|paint|depict)\b/,
  /\byou\s+are\s+(now|a|an)\b/,
  /\b(act|behave)\s+as\b/,
  /\bpretend\s+(to|you|that)\b/,
  /\boverride\b/,
  /\bprompt\s*[:=]/,
];

/**
 * Clearly-disallowed content for a family portrait. Kept focused on
 * unambiguous abuse terms so legitimate places/objects aren't over-blocked;
 * the provider policy layer (ADR 0007) catches the long tail.
 */
const DISALLOWED_PATTERNS: RegExp[] = [
  /\b(nude|nudity|naked|nsfw|porn(ographic)?|sexual|explicit|erotic|fetish)\b/,
  /\b(gore|gory|dismember\w*|mutilat\w*|corpse|corpses)\b/,
  /\b(nazi|swastika|hitler|isis)\b/,
  /\bchild\s+(porn|sexual|abuse)\b/,
];

/**
 * Runs the content guard over one free-text field. Callers should already have
 * trimmed the value and enforced the length cap; this only judges content.
 */
export function checkFamilyPictureContent(text: string): ContentGuardResult {
  // Normalize so simple obfuscation (runs of whitespace, casing) can't slip a
  // banned phrase past the word-boundary patterns.
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { ok: false, reason: "injection" };
  }
  if (DISALLOWED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { ok: false, reason: "disallowed" };
  }
  return { ok: true };
}
