import { describe, expect, it } from "vitest";
import { serializeGedcom } from "./serializer";

describe("serializeGedcom", () => {
  it("emits a HEAD with GEDCOM 5.5.1 version and UTF-8 charset", () => {
    const output = serializeGedcom({ individuals: [] });

    expect(output).toContain("0 HEAD\r\n");
    expect(output).toContain("2 VERS 5.5.1\r\n");
    expect(output).toContain("1 CHAR UTF-8\r\n");
  });

  it("ends with a TRLR line", () => {
    const output = serializeGedcom({ individuals: [] });

    expect(output.trimEnd().endsWith("0 TRLR")).toBe(true);
  });

  it("emits one INDI record per individual with a NAME line", () => {
    const output = serializeGedcom({
      individuals: [
        { xrefId: "I1", givenName: "Elena", surname: "Ivanova" },
        { xrefId: "I2", givenName: "Pedro", surname: "Garcia" },
      ],
    });

    expect(output).toContain("0 @I1@ INDI\r\n1 NAME Elena /Ivanova/\r\n");
    expect(output).toContain("0 @I2@ INDI\r\n1 NAME Pedro /Garcia/\r\n");
  });

  it("produces a valid NAME line for an individual with no surname", () => {
    const output = serializeGedcom({
      individuals: [{ xrefId: "I1", givenName: "Madonna", surname: "" }],
    });

    expect(output).toContain("1 NAME Madonna //\r\n");
  });
});
