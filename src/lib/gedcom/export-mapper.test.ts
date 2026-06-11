import { describe, expect, it } from "vitest";
import { mapMembersToGedcomIndividuals } from "./export-mapper";

describe("mapMembersToGedcomIndividuals", () => {
  it("maps each member to a GEDCOM individual with a unique xref", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Elena", lastName: "Ivanova" },
      { id: "m2", firstName: "Pedro", lastName: "Garcia" },
    ]);

    expect(result).toEqual([
      { xrefId: "I1", givenName: "Elena", surname: "Ivanova" },
      { xrefId: "I2", givenName: "Pedro", surname: "Garcia" },
    ]);
  });

  it("maps a member with no last name to an empty surname", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Madonna", lastName: null },
    ]);

    expect(result).toEqual([
      { xrefId: "I1", givenName: "Madonna", surname: "" },
    ]);
  });

  it("maps a member with an undefined last name to an empty surname", () => {
    const result = mapMembersToGedcomIndividuals([
      { id: "m1", firstName: "Madonna" },
    ]);

    expect(result).toEqual([
      { xrefId: "I1", givenName: "Madonna", surname: "" },
    ]);
  });
});
