import { describe, expect, it } from "vitest";
import { decodeGedcomBuffer, isSupportedCharset } from "./encoding";

function toBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe("decodeGedcomBuffer", () => {
  it("decodes a plain UTF-8 buffer", () => {
    expect(decodeGedcomBuffer(toBuffer("0 @I1@ INDI"))).toBe("0 @I1@ INDI");
  });

  it("decodes a UTF-8 buffer with a BOM", () => {
    const text = decodeGedcomBuffer(toBuffer("﻿0 @I1@ INDI"));
    expect(text).toContain("0 @I1@ INDI");
  });

  it("returns null for a UTF-16LE buffer", () => {
    const utf16 = Buffer.from("﻿0 @I1@ INDI", "utf16le");
    const buffer = utf16.buffer.slice(
      utf16.byteOffset,
      utf16.byteOffset + utf16.byteLength,
    ) as ArrayBuffer;

    expect(decodeGedcomBuffer(buffer)).toBeNull();
  });

  it("returns null for bytes that are not valid UTF-8", () => {
    const invalid = new Uint8Array([0x30, 0x20, 0xff, 0xfe, 0x80]);
    expect(decodeGedcomBuffer(invalid.buffer)).toBeNull();
  });
});

describe("isSupportedCharset", () => {
  it("treats a missing CHAR tag as supported", () => {
    expect(isSupportedCharset(undefined)).toBe(true);
  });

  it("accepts UTF-8 and ASCII variants", () => {
    expect(isSupportedCharset("UTF-8")).toBe(true);
    expect(isSupportedCharset("UTF8")).toBe(true);
    expect(isSupportedCharset("ASCII")).toBe(true);
    expect(isSupportedCharset("ascii")).toBe(true);
  });

  it("rejects ANSEL and other legacy charsets", () => {
    expect(isSupportedCharset("ANSEL")).toBe(false);
    expect(isSupportedCharset("ANSI")).toBe(false);
    expect(isSupportedCharset("UNICODE")).toBe(false);
  });
});
