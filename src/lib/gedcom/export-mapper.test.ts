import { describe, expect, it } from "vitest";
import {
  mapMembersToGedcomIndividuals,
  mapRelationshipsToGedcomFamilies,
} from "./export-mapper";

describe("mapMembersToGedcomIndividuals", () => {
  it("maps each member to a GEDCOM individual with a unique xref", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", lastName: "Ivanova" },
      { id: "m2", firstName: "Pedro", lastName: "Garcia" },
    ]);

    expect(result[0]).toMatchObject({
      xrefId: "I1",
      givenName: "Elena",
      surname: "Ivanova",
    });
    expect(result[1]).toMatchObject({
      xrefId: "I2",
      givenName: "Pedro",
      surname: "Garcia",
    });
  });

  it("maps a member with no last name to an empty surname", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Madonna", lastName: null },
    ]);

    expect(result[0]).toMatchObject({
      xrefId: "I1",
      givenName: "Madonna",
      surname: "",
    });
  });

  it("maps a member with an undefined last name to an empty surname", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Madonna" },
    ]);

    expect(result[0]).toMatchObject({
      xrefId: "I1",
      givenName: "Madonna",
      surname: "",
    });
  });

  it("maps all four gender values to GEDCOM SEX codes", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "A", gender: "male" },
      { id: "m2", firstName: "B", gender: "female" },
      { id: "m3", firstName: "C", gender: "other" },
      { id: "m4", firstName: "D", gender: "undisclosed" },
    ]);

    expect(result.map((r) => r.sex)).toEqual(["M", "F", "X", "U"]);
  });

  it("defaults to U when gender is not provided", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "A" },
    ]);

    expect(result[0].sex).toBe("U");
  });

  it("emits BIRT/DEAT dates at day precision", () => {
    const result = mapMembersToGedcomIndividuals([
      {
        id: "m1",
        firstName: "Elena",
        birthPrecision: "day",
        birthYear: 1892,
        birthMonth: 3,
        birthDay: 15,
        deathPrecision: "day",
        deathYear: 1950,
        deathMonth: 12,
        deathDay: 1,
      },
    ]);

    expect(result[0].birthDate).toBe("15 MAR 1892");
    expect(result[0].deathDate).toBe("1 DEC 1950");
  });

  it("emits dates at month precision", () => {
    const result = mapMembersToGedcomIndividuals([
      {
        id: "m1",
        firstName: "Elena",
        birthPrecision: "month",
        birthYear: 1892,
        birthMonth: 3,
      },
    ]);

    expect(result[0].birthDate).toBe("MAR 1892");
  });

  it("emits dates at year precision", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", birthPrecision: "year", birthYear: 1892 },
    ]);

    expect(result[0].birthDate).toBe("1892");
  });

  it("emits no DATE when a member has no birth or death info", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena" },
    ]);

    expect(result[0].birthDate).toBeUndefined();
    expect(result[0].deathDate).toBeUndefined();
  });

  it("maps a bio to a NOTE", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", bio: "A long life story." },
    ]);

    expect(result[0].note).toBe("A long life story.");
  });

  it("includes maidenSurname when member has a maidenName", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", lastName: "Ivanova", maidenName: "Petrova" },
    ]);

    expect(result[0]).toMatchObject({
      surname: "Ivanova",
      maidenSurname: "Petrova",
    });
  });

  it("omits maidenSurname when member has no maidenName", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", lastName: "Ivanova" },
    ]);

    expect(result[0].maidenSurname).toBeUndefined();
  });

  it("omits maidenSurname when maidenName is empty", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", lastName: "Ivanova", maidenName: "" },
    ]);

    expect(result[0].maidenSurname).toBeUndefined();
  });

  it("omits NOTE when bio is empty or missing", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", bio: "" },
      { id: "m2", firstName: "Pedro" },
    ]);

    expect(result[0].note).toBeUndefined();
    expect(result[1].note).toBeUndefined();
  });
});

describe("mapRelationshipsToGedcomFamilies", () => {
  it("groups spouses with shared children into a FAM with HUSB/WIFE/CHIL", () => {
    const members = [
      { id: "dad", firstName: "Ivan", gender: "male" as const },
      { id: "mom", firstName: "Elena", gender: "female" as const },
      { id: "kid", firstName: "Pedro" },
    ];
    const relationships = [
      { fromMemberId: "dad", toMemberId: "kid", type: "parent" as const },
      { fromMemberId: "mom", toMemberId: "kid", type: "parent" as const },
      { fromMemberId: "dad", toMemberId: "mom", type: "spouse" as const },
    ];

    const families = mapRelationshipsToGedcomFamilies(members, relationships);

    expect(families).toEqual([
      {
        xrefId: "F1",
        husbandXrefId: "I1",
        wifeXrefId: "I2",
        childXrefIds: ["I3"],
      },
    ]);
  });

  it("groups a single parent with children into a FAM with one parent", () => {
    const members = [
      { id: "mom", firstName: "Elena", gender: "female" as const },
      { id: "kid1", firstName: "Pedro" },
      { id: "kid2", firstName: "Maria" },
    ];
    const relationships = [
      { fromMemberId: "mom", toMemberId: "kid1", type: "parent" as const },
      { fromMemberId: "mom", toMemberId: "kid2", type: "parent" as const },
    ];

    const families = mapRelationshipsToGedcomFamilies(members, relationships);

    expect(families).toEqual([
      {
        xrefId: "F1",
        husbandXrefId: undefined,
        wifeXrefId: "I1",
        childXrefIds: ["I2", "I3"],
      },
    ]);
  });

  it("emits a FAM with HUSB/WIFE and no CHIL for a childless couple", () => {
    const members = [
      { id: "dad", firstName: "Ivan", gender: "male" as const },
      { id: "mom", firstName: "Elena", gender: "female" as const },
    ];
    const relationships = [
      { fromMemberId: "dad", toMemberId: "mom", type: "spouse" as const },
    ];

    const families = mapRelationshipsToGedcomFamilies(members, relationships);

    expect(families).toEqual([
      {
        xrefId: "F1",
        husbandXrefId: "I1",
        wifeXrefId: "I2",
        childXrefIds: [],
      },
    ]);
  });

  it("emits a parentless FAM with CHIL for a sibling-only pair", () => {
    const members = [
      { id: "sib1", firstName: "Pedro" },
      { id: "sib2", firstName: "Maria" },
    ];
    const relationships = [
      { fromMemberId: "sib1", toMemberId: "sib2", type: "sibling" as const },
    ];

    const families = mapRelationshipsToGedcomFamilies(members, relationships);

    expect(families).toEqual([
      {
        xrefId: "F1",
        husbandXrefId: undefined,
        wifeXrefId: undefined,
        childXrefIds: ["I1", "I2"],
      },
    ]);
  });

  it("does not emit a parentless sibling FAM when siblings already share a parent FAM", () => {
    const members = [
      { id: "dad", firstName: "Ivan", gender: "male" as const },
      { id: "kid1", firstName: "Pedro" },
      { id: "kid2", firstName: "Maria" },
    ];
    const relationships = [
      { fromMemberId: "dad", toMemberId: "kid1", type: "parent" as const },
      { fromMemberId: "dad", toMemberId: "kid2", type: "parent" as const },
      { fromMemberId: "kid1", toMemberId: "kid2", type: "sibling" as const },
    ];

    const families = mapRelationshipsToGedcomFamilies(members, relationships);

    expect(families).toEqual([
      {
        xrefId: "F1",
        husbandXrefId: "I1",
        wifeXrefId: undefined,
        childXrefIds: ["I2", "I3"],
      },
    ]);
  });

  it("returns no families when there are no relationships", () => {
    const members = [{ id: "m1", firstName: "Elena" }];

    expect(mapRelationshipsToGedcomFamilies(members, [])).toEqual([]);
  });
});
