import { describe, expect, it } from "vitest";
import {
  mapTreeToGedcomDocument,
  type ExportableMember,
  type ExportableRelationship,
} from "./export-mapper";
import { serializeGedcom } from "./serializer";
import { parseGedcom } from "./parser";
import { mapGedcomToMembers } from "./import-mapper";

interface NamedMember {
  id: string;
  firstName: string;
  lastName?: string | null;
}

interface NamedRelationship {
  fromMemberId: string;
  toMemberId: string;
  type: "parent" | "spouse" | "sibling";
}

function signature(members: NamedMember[], relationships: NamedRelationship[]) {
  const nameById = new Map(
    members.map((m) => [m.id, `${m.firstName}|${m.lastName ?? ""}`]),
  );

  const memberNames = [...nameById.values()].sort();

  const relSignatures = relationships
    .map((r) => {
      const fromName = nameById.get(r.fromMemberId)!;
      const toName = nameById.get(r.toMemberId)!;
      if (r.type === "parent") return `parent:${fromName}>${toName}`;
      const [a, b] = [fromName, toName].sort();
      return `${r.type}:${a}|${b}`;
    })
    .sort();

  return { memberNames, relSignatures };
}

describe("GEDCOM round trip", () => {
  it("is structurally stable for members and parent/spouse/sibling relationships", () => {
    const members: ExportableMember[] = [
      { id: "m1", firstName: "Dad", lastName: "Smith", gender: "male" },
      { id: "m2", firstName: "Mom", lastName: "Smith", gender: "female" },
      { id: "m3", firstName: "Kid1", lastName: "Smith" },
      { id: "m4", firstName: "Kid2", lastName: "Smith" },
      { id: "m5", firstName: "Aunt", lastName: "Jones", gender: "female" },
      { id: "m6", firstName: "Uncle", lastName: "Jones", gender: "male" },
      { id: "m7", firstName: "Sib1", lastName: "Brown" },
      { id: "m8", firstName: "Sib2", lastName: "Brown" },
    ];

    const relationships: ExportableRelationship[] = [
      { fromMemberId: "m1", toMemberId: "m3", type: "parent" },
      { fromMemberId: "m1", toMemberId: "m4", type: "parent" },
      { fromMemberId: "m2", toMemberId: "m3", type: "parent" },
      { fromMemberId: "m2", toMemberId: "m4", type: "parent" },
      { fromMemberId: "m1", toMemberId: "m2", type: "spouse" },
      { fromMemberId: "m5", toMemberId: "m6", type: "spouse" },
      { fromMemberId: "m7", toMemberId: "m8", type: "sibling" },
    ];

    const before = signature(members, relationships);

    // export -> import
    const document1 = mapTreeToGedcomDocument(members, relationships);
    const text1 = serializeGedcom(document1);
    const records1 = parseGedcom(text1);
    const { members: imported, relationships: importedRelationships } =
      mapGedcomToMembers(records1);

    const afterImport = signature(imported, importedRelationships);
    expect(afterImport).toEqual(before);

    // re-export
    const exportable: ExportableMember[] = imported.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      gender: m.gender,
    }));
    const document2 = mapTreeToGedcomDocument(exportable, importedRelationships);
    const text2 = serializeGedcom(document2);
    const records2 = parseGedcom(text2);
    const { members: reimported, relationships: reimportedRelationships } =
      mapGedcomToMembers(records2);

    const afterReExport = signature(reimported, reimportedRelationships);
    expect(afterReExport).toEqual(before);
  });

  it("preserves a member's bio across export and import", () => {
    const members: ExportableMember[] = [
      {
        id: "m1",
        firstName: "John",
        lastName: "Smith",
        gender: "male",
        bio: "A farmer who lived\nin Springfield his whole life.",
      },
    ];

    const document = mapTreeToGedcomDocument(members, []);
    const text = serializeGedcom(document);
    const records = parseGedcom(text);
    const { members: imported } = mapGedcomToMembers(records);

    expect(imported[0].bio).toBe(
      "A farmer who lived\nin Springfield his whole life.",
    );
  });
});
