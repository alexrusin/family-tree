import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parser";
import { mapGedcomToMembers } from "./import-mapper";

describe("mapGedcomToMembers", () => {
  it("maps a NAME of 'Given /Surname/' to firstName/lastName", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toEqual([
      { xrefId: "I1", firstName: "John", lastName: "Smith" },
    ]);
    expect(report).toEqual({ importedCount: 1, unknownNameCount: 0 });
  });

  it("maps a NAME with no surname to a null lastName", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME Madonna //"].join("\n"),
    );

    const { members } = mapGedcomToMembers(records);

    expect(members).toEqual([
      { xrefId: "I1", firstName: "Madonna", lastName: null },
    ]);
  });

  it("falls back to 'Unknown' for an INDI with no usable name and counts it in the report", () => {
    const records = parseGedcom(["0 @I1@ INDI", "1 SEX M"].join("\n"));

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toEqual([
      { xrefId: "I1", firstName: "Unknown", lastName: null },
    ]);
    expect(report).toEqual({ importedCount: 1, unknownNameCount: 1 });
  });

  it("falls back to 'Unknown' when NAME has no given name", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME /Smith/"].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toEqual([
      { xrefId: "I1", firstName: "Unknown", lastName: "Smith" },
    ]);
    expect(report.unknownNameCount).toBe(1);
  });

  it("collapses duplicate @XREF@ ids into a single member", () => {
    const records = parseGedcom(
      [
        "0 @I1@ INDI",
        "1 NAME John /Smith/",
        "0 @I1@ INDI",
        "1 NAME Duplicate /Entry/",
      ].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toEqual([
      { xrefId: "I1", firstName: "John", lastName: "Smith" },
    ]);
    expect(report.importedCount).toBe(1);
  });

  it("ignores non-INDI top-level records", () => {
    const records = parseGedcom(
      [
        "0 HEAD",
        "1 GEDC",
        "0 @I1@ INDI",
        "1 NAME John /Smith/",
        "0 TRLR",
      ].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toHaveLength(1);
    expect(report.importedCount).toBe(1);
  });
});
