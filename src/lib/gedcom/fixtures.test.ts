import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parser";
import { mapGedcomToMembers } from "./import-mapper";

/**
 * Small, hand-built excerpts that mirror the dialect quirks of real exports
 * from major platforms: custom `_`-prefixed tags, OBJE/media, SOUR citations,
 * PLAC, and (for FamilySearch) a 7.0 header. None of these should throw, and
 * the unmapped pieces should surface in the Import Report.
 */
describe("real-world export fixtures", () => {
  it("imports an Ancestry-style export without throwing", () => {
    const text = [
      "0 HEAD",
      "1 SOUR Ancestry.com Family Trees",
      "1 GEDC",
      "2 VERS 5.5.1",
      "1 CHAR UTF-8",
      "0 @I1@ INDI",
      "1 NAME John /Smith/",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 1 JAN 1900",
      "2 PLAC Springfield, Illinois, USA",
      "2 SOUR @S1@",
      "1 _APID 1,234::5678",
      "0 @I2@ INDI",
      "1 NAME Jane /Smith/",
      "1 SEX F",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I2@",
      "1 MARR",
      "2 DATE 1925",
      "0 @S1@ SOUR",
      "1 TITL 1900 Census",
      "0 TRLR",
    ].join("\n");

    const records = parseGedcom(text);
    const { members, relationships, report } = mapGedcomToMembers(records);

    expect(members).toHaveLength(2);
    expect(relationships.some((r) => r.type === "spouse")).toBe(true);
    expect(report.skippedPlacesCount).toBeGreaterThan(0);
    expect(report.skippedSourcesCount).toBeGreaterThan(0);
    expect(report.skippedEventsCount).toBeGreaterThan(0);
  });

  it("imports a MyHeritage-style export without throwing", () => {
    const text = [
      "0 HEAD",
      "1 SOUR MyHeritage Family Trees",
      "1 GEDC",
      "2 VERS 5.5.1",
      "1 CHAR UTF-8",
      "0 @I1@ INDI",
      "1 NAME Maria /Garcia/",
      "1 SEX F",
      "1 _UID 12345678-ABCD-EF00-0000-000000000001",
      "1 BIRT",
      "2 DATE ABT 1955",
      "2 PLAC Madrid, Spain",
      "0 @I2@ INDI",
      "1 NAME Carlos /Garcia/",
      "1 SEX M",
      "1 NOTE Family story passed down about Carlos.",
      "0 @F1@ FAM",
      "1 HUSB @I2@",
      "1 CHIL @I1@",
      "0 TRLR",
    ].join("\n");

    const records = parseGedcom(text);
    const { members, relationships, report } = mapGedcomToMembers(records);

    expect(members).toHaveLength(2);
    expect(relationships.some((r) => r.type === "parent")).toBe(true);
    expect(report.skippedNotesCount).toBeGreaterThan(0);
    expect(report.skippedPlacesCount).toBeGreaterThan(0);
    expect(report.droppedDateCount).toBe(0);
    const maria = members.find((m) => m.firstName === "Maria");
    expect(maria?.birthPrecision).toBe("year");
    expect(maria?.birthYear).toBe(1955);
  });

  it("imports a FamilySearch-style (GEDCOM 7.0) export without throwing", () => {
    const text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "1 CHAR UTF-8",
      "1 SOUR FamilySearch",
      "0 @I1@ INDI",
      "1 NAME Wei /Chen/",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 12 MAR 1932",
      "2 PLAC Shanghai, China",
      "1 DEAT",
      "2 DATE BET 2000 AND 2005",
      "0 @I2@ INDI",
      "1 NAME Mei /Chen/",
      "1 SEX F",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I2@",
      "0 TRLR",
    ].join("\n");

    const records = parseGedcom(text);
    const { members, relationships, report } = mapGedcomToMembers(records);

    expect(members).toHaveLength(2);
    expect(relationships.some((r) => r.type === "spouse")).toBe(true);
    expect(report.droppedDateCount).toBe(1);
    const wei = members.find((m) => m.firstName === "Wei");
    expect(wei?.birthPrecision).toBe("day");
    expect(wei?.deathPrecision ?? null).toBeNull();
  });
});
