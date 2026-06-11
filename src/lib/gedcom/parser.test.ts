import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parser";

describe("parseGedcom", () => {
  it("parses a basic INDI record with a NAME into a level/tag/xref/value tree", () => {
    const text = ["0 @I1@ INDI", "1 NAME John /Smith/", "1 SEX M"].join(
      "\r\n",
    );

    const roots = parseGedcom(text);

    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ level: 0, tag: "INDI", xrefId: "I1" });
    expect(roots[0].children).toEqual([
      { level: 1, tag: "NAME", xrefId: undefined, value: "John /Smith/", children: [] },
      { level: 1, tag: "SEX", xrefId: undefined, value: "M", children: [] },
    ]);
  });

  it("parses multiple top-level records", () => {
    const text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 5.5.1",
      "0 @I1@ INDI",
      "1 NAME Jane /Doe/",
      "0 TRLR",
    ].join("\n");

    const roots = parseGedcom(text);

    expect(roots.map((r) => r.tag)).toEqual(["HEAD", "INDI", "TRLR"]);
    expect(roots[0].children[0]).toMatchObject({ tag: "GEDC" });
    expect(roots[0].children[0].children[0]).toMatchObject({
      tag: "VERS",
      value: "5.5.1",
    });
  });

  it("joins CONC lines onto the value of the preceding line without a separator", () => {
    const text = [
      "0 @I1@ INDI",
      "1 NOTE This is a long",
      "2 CONC  note that continues",
      "2 CONC  on the same line",
    ].join("\r\n");

    const roots = parseGedcom(text);
    const note = roots[0].children.find((c) => c.tag === "NOTE");

    expect(note?.value).toBe(
      "This is a long note that continues on the same line",
    );
  });

  it("joins CONT lines onto the value of the preceding line with a newline", () => {
    const text = [
      "0 @I1@ INDI",
      "1 NOTE First line",
      "2 CONT Second line",
      "2 CONT Third line",
    ].join("\r\n");

    const roots = parseGedcom(text);
    const note = roots[0].children.find((c) => c.tag === "NOTE");

    expect(note?.value).toBe("First line\nSecond line\nThird line");
  });

  it("strips a leading BOM before parsing", () => {
    const text = "﻿0 @I1@ INDI\r\n1 NAME Ana /Lopez/";

    const roots = parseGedcom(text);

    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ level: 0, tag: "INDI", xrefId: "I1" });
  });

  it("ignores blank lines", () => {
    const text = ["0 @I1@ INDI", "", "1 NAME Ana /Lopez/", "   "].join("\n");

    const roots = parseGedcom(text);

    expect(roots).toHaveLength(1);
    expect(roots[0].children).toHaveLength(1);
  });
});
