const UTF16_LE_BOM = [0xff, 0xfe];
const UTF16_BE_BOM = [0xfe, 0xff];

const SUPPORTED_CHARSETS = new Set(["UTF-8", "UTF8", "ASCII", "US-ASCII"]);

function startsWithBytes(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((byte, index) => bytes[index] === byte);
}

/**
 * Decodes a raw GEDCOM upload as UTF-8. Returns `null` if the bytes are not
 * valid UTF-8 (e.g. a UTF-16 BOM or legacy 8-bit encodings like ANSEL/ANSI,
 * which produce invalid byte sequences and surface as U+FFFD).
 */
export function decodeGedcomBuffer(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  if (
    startsWithBytes(bytes, UTF16_LE_BOM) ||
    startsWithBytes(bytes, UTF16_BE_BOM)
  ) {
    return null;
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.includes("�")) return null;

  return text;
}

/**
 * Whether a GEDCOM `HEAD.CHAR` value is a charset we can read losslessly.
 * An absent tag is treated as supported (lenient dialect handling).
 */
export function isSupportedCharset(charset: string | undefined): boolean {
  if (!charset) return true;
  return SUPPORTED_CHARSETS.has(charset.trim().toUpperCase());
}
