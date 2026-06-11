import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parser";
import { mapGedcomToMembers } from "./import-mapper";

const baseReport = {
  unknownNameCount: 0,
  relationshipCount: 0,
  droppedDateCount: 0,
  inferredLivingCount: 0,
  danglingRelationshipCount: 0,
  skippedPlacesCount: 0,
  skippedEventsCount: 0,
  skippedSourcesCount: 0,
  skippedNotesCount: 0,
};

describe("mapGedcomToMembers", () => {
  it("maps a NAME of 'Given /Surname/' to firstName/lastName", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toMatchObject([
      { xrefId: "I1", firstName: "John", lastName: "Smith" },
    ]);
    expect(report).toEqual({ ...baseReport, importedCount: 1 });
  });

  it("maps a NAME with no surname to a null lastName", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME Madonna //"].join("\n"),
    );

    const { members } = mapGedcomToMembers(records);

    expect(members).toMatchObject([
      { xrefId: "I1", firstName: "Madonna", lastName: null },
    ]);
  });

  it("falls back to 'Unknown' for an INDI with no usable name and counts it in the report", () => {
    const records = parseGedcom(["0 @I1@ INDI", "1 SEX M"].join("\n"));

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toMatchObject([
      { xrefId: "I1", firstName: "Unknown", lastName: null },
    ]);
    expect(report).toEqual({
      ...baseReport,
      importedCount: 1,
      unknownNameCount: 1,
    });
  });

  it("falls back to 'Unknown' when NAME has no given name", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME /Smith/"].join("\n"),
    );

    const { members, report } = mapGedcomToMembers(records);

    expect(members).toMatchObject([
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

    expect(members).toMatchObject([
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

  it("assigns each member a generated id", () => {
    const records = parseGedcom(
      ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
    );

    const { members } = mapGedcomToMembers(records);

    expect(members[0].id).toEqual(expect.any(String));
    expect(members[0].id.length).toBeGreaterThan(0);
  });

  describe("gender mapping", () => {
    it.each([
      ["M", "male"],
      ["F", "female"],
      ["X", "other"],
      ["U", "undisclosed"],
      ["N", "undisclosed"],
    ])("maps SEX %s to %s", (sex, expected) => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/", `1 SEX ${sex}`].join("\n"),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0].gender).toBe(expected);
    });

    it("maps a missing SEX to undisclosed", () => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0].gender).toBe("undisclosed");
    });
  });

  describe("date mapping", () => {
    it("maps an exact day-precision date", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          "2 DATE 10 JUN 1985",
        ].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0]).toMatchObject({
        birthPrecision: "day",
        birthYear: 1985,
        birthMonth: 6,
        birthDay: 10,
      });
      expect(report.droppedDateCount).toBe(0);
    });

    it("maps a month-year date to month precision", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          "2 DATE JUN 1985",
        ].join("\n"),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0]).toMatchObject({
        birthPrecision: "month",
        birthYear: 1985,
        birthMonth: 6,
        birthDay: null,
      });
    });

    it("maps a bare year to year precision", () => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/", "1 BIRT", "2 DATE 1985"].join(
          "\n",
        ),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0]).toMatchObject({
        birthPrecision: "year",
        birthYear: 1985,
        birthMonth: null,
        birthDay: null,
      });
    });

    it.each(["ABT 1985", "EST 1985", "CAL 1985", "ABT 10 JUN 1985"])(
      "maps approximate date %s to year precision only",
      (value) => {
        const records = parseGedcom(
          ["0 @I1@ INDI", "1 NAME John /Smith/", "1 BIRT", `2 DATE ${value}`].join(
            "\n",
          ),
        );

        const { members } = mapGedcomToMembers(records);

        expect(members[0]).toMatchObject({
          birthPrecision: "year",
          birthYear: 1985,
          birthMonth: null,
          birthDay: null,
        });
      },
    );

    it.each(["BEF 1985", "AFT 1985", "BET 1980 AND 1990", "FROM 1980 TO 1990"])(
      "drops a bound/range date %s and counts it in the report",
      (value) => {
        const records = parseGedcom(
          ["0 @I1@ INDI", "1 NAME John /Smith/", "1 BIRT", `2 DATE ${value}`].join(
            "\n",
          ),
        );

        const { members, report } = mapGedcomToMembers(records);

        expect(members[0].birthPrecision).toBeNull();
        expect(members[0].birthYear).toBeNull();
        expect(report.droppedDateCount).toBe(1);
      },
    );

    it("counts dropped birth and death dates separately", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          "2 DATE BEF 1985",
          "1 DEAT",
          "2 DATE AFT 1990",
        ].join("\n"),
      );

      const { report } = mapGedcomToMembers(records);

      expect(report.droppedDateCount).toBe(2);
    });
  });

  describe("isLiving inference", () => {
    const recentYear = new Date().getFullYear() - 30;

    it("flags a member with a recent birth and no death record as living", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          `2 DATE ${recentYear}`,
        ].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0].isLiving).toBe(true);
      expect(report.inferredLivingCount).toBe(1);
    });

    it("does not flag a member with a death record as living", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          `2 DATE ${recentYear}`,
          "1 DEAT",
          "2 DATE 2000",
        ].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0].isLiving).toBe(false);
      expect(report.inferredLivingCount).toBe(0);
    });

    it("does not flag a member with an old birth year as living", () => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/", "1 BIRT", "2 DATE 1850"].join(
          "\n",
        ),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0].isLiving).toBe(false);
      expect(report.inferredLivingCount).toBe(0);
    });

    it("does not flag a member with no birth date as living", () => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0].isLiving).toBe(false);
      expect(report.inferredLivingCount).toBe(0);
    });
  });

  describe("relationship reconstruction", () => {
    it("maps a FAM with two parents and a child to parent and spouse edges", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME Dad /Smith/",
          "1 SEX M",
          "0 @I2@ INDI",
          "1 NAME Mom /Smith/",
          "1 SEX F",
          "0 @I3@ INDI",
          "1 NAME Kid /Smith/",
          "0 @F1@ FAM",
          "1 HUSB @I1@",
          "1 WIFE @I2@",
          "1 CHIL @I3@",
        ].join("\n"),
      );

      const { members, relationships, report } = mapGedcomToMembers(records);
      const idByXref = new Map(members.map((m) => [m.xrefId, m.id]));

      expect(relationships).toEqual(
        expect.arrayContaining([
          {
            fromMemberId: idByXref.get("I1"),
            toMemberId: idByXref.get("I3"),
            type: "parent",
          },
          {
            fromMemberId: idByXref.get("I2"),
            toMemberId: idByXref.get("I3"),
            type: "parent",
          },
          {
            fromMemberId: idByXref.get("I1"),
            toMemberId: idByXref.get("I2"),
            type: "spouse",
          },
        ]),
      );
      expect(relationships).toHaveLength(3);
      expect(report.relationshipCount).toBe(3);
    });

    it("does not create explicit sibling edges for co-children of a FAM with parents", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME Dad /Smith/",
          "0 @I2@ INDI",
          "1 NAME Kid1 /Smith/",
          "0 @I3@ INDI",
          "1 NAME Kid2 /Smith/",
          "0 @F1@ FAM",
          "1 HUSB @I1@",
          "1 CHIL @I2@",
          "1 CHIL @I3@",
        ].join("\n"),
      );

      const { relationships } = mapGedcomToMembers(records);

      expect(relationships.some((r) => r.type === "sibling")).toBe(false);
      expect(relationships.filter((r) => r.type === "parent")).toHaveLength(
        2,
      );
    });

    it("maps a parentless FAM with children to sibling edges among the children", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME Kid1 /Smith/",
          "0 @I2@ INDI",
          "1 NAME Kid2 /Smith/",
          "0 @I3@ INDI",
          "1 NAME Kid3 /Smith/",
          "0 @F1@ FAM",
          "1 CHIL @I1@",
          "1 CHIL @I2@",
          "1 CHIL @I3@",
        ].join("\n"),
      );

      const { members, relationships } = mapGedcomToMembers(records);
      const idByXref = new Map(members.map((m) => [m.xrefId, m.id]));

      const siblingPairs = relationships
        .filter((r) => r.type === "sibling")
        .map((r) => [r.fromMemberId, r.toMemberId].sort());

      expect(siblingPairs).toHaveLength(3);
      expect(siblingPairs).toEqual(
        expect.arrayContaining([
          [idByXref.get("I1"), idByXref.get("I2")].sort(),
          [idByXref.get("I1"), idByXref.get("I3")].sort(),
          [idByXref.get("I2"), idByXref.get("I3")].sort(),
        ]),
      );
    });

    it("drops and reports a relationship referencing a missing individual", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME Dad /Smith/",
          "0 @I2@ INDI",
          "1 NAME Kid /Smith/",
          "0 @F1@ FAM",
          "1 HUSB @I1@",
          "1 HUSB @I99@",
          "1 CHIL @I2@",
          "1 CHIL @I98@",
        ].join("\n"),
      );

      const { relationships, report } = mapGedcomToMembers(records);

      expect(
        relationships.every(
          (r) => r.fromMemberId !== "I99" && r.toMemberId !== "I98",
        ),
      ).toBe(true);
      expect(report.danglingRelationshipCount).toBeGreaterThan(0);
    });
  });

  describe("skipped data report", () => {
    it("counts PLAC, SOUR, and extra NOTEs under an individual as skipped", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          "2 DATE 1 JAN 1900",
          "2 PLAC Springfield, USA",
          "2 SOUR @S1@",
          "2 NOTE A note about his birth",
          "1 NOTE A bio note about John",
        ].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(report.skippedPlacesCount).toBe(1);
      expect(report.skippedSourcesCount).toBe(1);
      // The top-level NOTE is imported as the bio; the nested birth NOTE is skipped.
      expect(report.skippedNotesCount).toBe(1);
      expect(members[0].bio).toBe("A bio note about John");
    });

    it("counts unmapped event tags (e.g. OCCU, MARR) as skipped events", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 OCCU Farmer",
          "0 @I2@ INDI",
          "1 NAME Jane /Doe/",
          "0 @F1@ FAM",
          "1 HUSB @I1@",
          "1 WIFE @I2@",
          "1 MARR",
          "2 DATE 1920",
        ].join("\n"),
      );

      const { report } = mapGedcomToMembers(records);

      expect(report.skippedEventsCount).toBe(2);
    });

    it("does not count BIRT/DEAT or DATE as skipped events", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 BIRT",
          "2 DATE 1900",
          "1 DEAT",
          "2 DATE 1980",
        ].join("\n"),
      );

      const { report } = mapGedcomToMembers(records);

      expect(report.skippedEventsCount).toBe(0);
    });
  });

  describe("bio import", () => {
    it("imports a top-level NOTE (including CONT/CONC continuation) as the bio", () => {
      const records = parseGedcom(
        [
          "0 @I1@ INDI",
          "1 NAME John /Smith/",
          "1 NOTE A farmer who",
          "2 CONT lived in Springfield",
          "2 CONC  his whole life.",
        ].join("\n"),
      );

      const { members, report } = mapGedcomToMembers(records);

      expect(members[0].bio).toBe(
        "A farmer who\nlived in Springfield his whole life.",
      );
      expect(report.skippedNotesCount).toBe(0);
    });

    it("truncates an over-length bio to the model limit", () => {
      const longNote = "x".repeat(1500);
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/", `1 NOTE ${longNote}`].join("\n"),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0].bio).toHaveLength(1000);
    });

    it("leaves bio null when there is no NOTE", () => {
      const records = parseGedcom(
        ["0 @I1@ INDI", "1 NAME John /Smith/"].join("\n"),
      );

      const { members } = mapGedcomToMembers(records);

      expect(members[0].bio).toBeNull();
    });
  });
});
