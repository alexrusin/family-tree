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

  it("emits a SEX line when provided", () => {
    const output = serializeGedcom({
      individuals: [
        { xrefId: "I1", givenName: "Elena", surname: "Ivanova", sex: "F" },
      ],
    });

    expect(output).toContain("1 SEX F\r\n");
  });

  it("omits SEX when not provided", () => {
    const output = serializeGedcom({
      individuals: [{ xrefId: "I1", givenName: "Elena", surname: "Ivanova" }],
    });

    expect(output).not.toContain("SEX");
  });

  it("emits BIRT/DATE and DEAT/DATE when provided", () => {
    const output = serializeGedcom({
      individuals: [
        {
          xrefId: "I1",
          givenName: "Elena",
          surname: "Ivanova",
          birthDate: "15 MAR 1892",
          deathDate: "1950",
        },
      ],
    });

    expect(output).toContain("1 BIRT\r\n2 DATE 15 MAR 1892\r\n");
    expect(output).toContain("1 DEAT\r\n2 DATE 1950\r\n");
  });

  it("omits BIRT/DEAT when no dates are provided", () => {
    const output = serializeGedcom({
      individuals: [{ xrefId: "I1", givenName: "Elena", surname: "Ivanova" }],
    });

    expect(output).not.toContain("BIRT");
    expect(output).not.toContain("DEAT");
  });

  it("emits a single-line NOTE", () => {
    const output = serializeGedcom({
      individuals: [
        {
          xrefId: "I1",
          givenName: "Elena",
          surname: "Ivanova",
          note: "A short bio.",
        },
      ],
    });

    expect(output).toContain("1 NOTE A short bio.\r\n");
  });

  it("emits a multi-line NOTE using CONT for line breaks", () => {
    const output = serializeGedcom({
      individuals: [
        {
          xrefId: "I1",
          givenName: "Elena",
          surname: "Ivanova",
          note: "Line one.\nLine two.",
        },
      ],
    });

    expect(output).toContain("1 NOTE Line one.\r\n2 CONT Line two.\r\n");
  });

  it("emits a long single-line NOTE using CONC for continuation", () => {
    const longLine = "a".repeat(250);
    const output = serializeGedcom({
      individuals: [
        { xrefId: "I1", givenName: "Elena", surname: "Ivanova", note: longLine },
      ],
    });

    expect(output).toContain(`1 NOTE ${"a".repeat(200)}\r\n2 CONC ${"a".repeat(50)}\r\n`);
  });

  it("emits FAM records with HUSB, WIFE, and CHIL pointers", () => {
    const output = serializeGedcom({
      individuals: [],
      families: [
        {
          xrefId: "F1",
          husbandXrefId: "I1",
          wifeXrefId: "I2",
          childXrefIds: ["I3", "I4"],
        },
      ],
    });

    expect(output).toContain(
      "0 @F1@ FAM\r\n1 HUSB @I1@\r\n1 WIFE @I2@\r\n1 CHIL @I3@\r\n1 CHIL @I4@\r\n",
    );
  });

  it("emits a FAM record with only CHIL when no parents are present", () => {
    const output = serializeGedcom({
      individuals: [],
      families: [{ xrefId: "F1", childXrefIds: ["I1", "I2"] }],
    });

    expect(output).toContain("0 @F1@ FAM\r\n1 CHIL @I1@\r\n1 CHIL @I2@\r\n");
    expect(output).not.toContain("HUSB");
    expect(output).not.toContain("WIFE");
  });
});
