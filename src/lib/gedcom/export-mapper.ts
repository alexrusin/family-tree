import type {
  GedcomDocument,
  GedcomFamily,
  GedcomIndividual,
  GedcomSex,
} from "./serializer";

export type ExportableGender = "male" | "female" | "other" | "undisclosed";
export type ExportableDatePrecision = "year" | "month" | "day";
export type ExportableRelationshipType = "parent" | "spouse" | "sibling";

export interface ExportableMember {
  id: string;
  firstName: string;
  lastName?: string | null;
  gender?: ExportableGender | null;
  bio?: string | null;
  birthPrecision?: ExportableDatePrecision | null;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathPrecision?: ExportableDatePrecision | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
}

export interface ExportableRelationship {
  fromMemberId: string;
  toMemberId: string;
  type: ExportableRelationshipType;
}

const GENDER_TO_SEX: Record<ExportableGender, GedcomSex> = {
  male: "M",
  female: "F",
  other: "X",
  undisclosed: "U",
};

const GEDCOM_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatGedcomDate(
  precision: ExportableDatePrecision,
  year: number,
  month?: number | null,
  day?: number | null,
): string | undefined {
  if (precision === "year") {
    return `${year}`;
  }

  if (precision === "month") {
    if (!month) return `${year}`;
    return `${GEDCOM_MONTHS[month - 1]} ${year}`;
  }

  if (!month || !day) {
    return `${year}`;
  }

  return `${day} ${GEDCOM_MONTHS[month - 1]} ${year}`;
}

export function buildMemberXrefMap(
  members: ExportableMember[],
): Map<string, string> {
  const xrefMap = new Map<string, string>();
  members.forEach((member, index) => {
    xrefMap.set(member.id, `I${index + 1}`);
  });
  return xrefMap;
}

export function mapMembersToGedcomIndividuals(
  members: ExportableMember[],
): GedcomIndividual[] {
  return members.map((member, index) => {
    const individual: GedcomIndividual = {
      xrefId: `I${index + 1}`,
      givenName: member.firstName.trim(),
      surname: member.lastName?.trim() ?? "",
      sex: GENDER_TO_SEX[member.gender ?? "undisclosed"],
    };

    if (member.birthPrecision != null && member.birthYear != null) {
      individual.birthDate = formatGedcomDate(
        member.birthPrecision,
        member.birthYear,
        member.birthMonth,
        member.birthDay,
      );
    }

    if (member.deathPrecision != null && member.deathYear != null) {
      individual.deathDate = formatGedcomDate(
        member.deathPrecision,
        member.deathYear,
        member.deathMonth,
        member.deathDay,
      );
    }

    if (member.bio?.trim()) {
      individual.note = member.bio.trim();
    }

    return individual;
  });
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function assignSpouseSlots(parents: ExportableMember[]): {
  husband?: ExportableMember;
  wife?: ExportableMember;
} {
  const remaining = [...parents];
  let husband: ExportableMember | undefined;
  let wife: ExportableMember | undefined;

  const maleIndex = remaining.findIndex((m) => m.gender === "male");
  if (maleIndex !== -1) {
    husband = remaining.splice(maleIndex, 1)[0];
  }

  const femaleIndex = remaining.findIndex((m) => m.gender === "female");
  if (femaleIndex !== -1) {
    wife = remaining.splice(femaleIndex, 1)[0];
  }

  if (!husband && remaining.length > 0) {
    husband = remaining.shift();
  }

  if (!wife && remaining.length > 0) {
    wife = remaining.shift();
  }

  return { husband, wife };
}

class UnionFind {
  private parents = new Map<string, string>();

  add(id: string): void {
    if (!this.parents.has(id)) {
      this.parents.set(id, id);
    }
  }

  find(id: string): string {
    const parent = this.parents.get(id) ?? id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parents.set(id, root);
    return root;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parents.set(rootA, rootB);
    }
  }

  groups(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const id of this.parents.keys()) {
      const root = this.find(id);
      const group = result.get(root) ?? [];
      group.push(id);
      result.set(root, group);
    }
    return result;
  }
}

export function mapRelationshipsToGedcomFamilies(
  members: ExportableMember[],
  relationships: ExportableRelationship[],
): GedcomFamily[] {
  const xrefMap = buildMemberXrefMap(members);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const memberOrder = new Map(members.map((m, index) => [m.id, index]));

  const families: GedcomFamily[] = [];
  let familyCounter = 0;
  const nextFamilyXref = () => `F${++familyCounter}`;

  // Group children by their exact (sorted) parent-set.
  const parentsByChild = new Map<string, Set<string>>();
  for (const rel of relationships) {
    if (rel.type !== "parent") continue;
    const set = parentsByChild.get(rel.toMemberId) ?? new Set<string>();
    set.add(rel.fromMemberId);
    parentsByChild.set(rel.toMemberId, set);
  }

  const childrenByParentSet = new Map<string, { parentIds: string[]; childIds: string[] }>();
  for (const [childId, parentSet] of parentsByChild.entries()) {
    const parentIds = [...parentSet].sort(
      (a, b) => (memberOrder.get(a) ?? 0) - (memberOrder.get(b) ?? 0),
    );
    const key = parentIds.join("|");
    const entry = childrenByParentSet.get(key) ?? { parentIds, childIds: [] };
    entry.childIds.push(childId);
    childrenByParentSet.set(key, entry);
  }

  // Sort entries by member order of their first child for deterministic output.
  const parentSetEntries = [...childrenByParentSet.values()].sort(
    (a, b) =>
      (memberOrder.get(a.childIds[0]) ?? 0) -
      (memberOrder.get(b.childIds[0]) ?? 0),
  );

  const coveredSpousePairs = new Set<string>();

  for (const entry of parentSetEntries) {
    const parentMembers = entry.parentIds
      .map((id) => memberById.get(id))
      .filter((m): m is ExportableMember => m != null);

    const { husband, wife } = assignSpouseSlots(parentMembers);

    const childXrefIds = entry.childIds
      .slice()
      .sort((a, b) => (memberOrder.get(a) ?? 0) - (memberOrder.get(b) ?? 0))
      .map((id) => xrefMap.get(id)!);

    families.push({
      xrefId: nextFamilyXref(),
      husbandXrefId: husband ? xrefMap.get(husband.id) : undefined,
      wifeXrefId: wife ? xrefMap.get(wife.id) : undefined,
      childXrefIds,
    });

    if (entry.parentIds.length === 2) {
      coveredSpousePairs.add(pairKey(entry.parentIds[0], entry.parentIds[1]));
    }
  }

  // Childless spouse pairs: emit a FAM with HUSB/WIFE and no CHIL.
  const seenSpousePairs = new Set<string>();
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    const key = pairKey(rel.fromMemberId, rel.toMemberId);
    if (seenSpousePairs.has(key) || coveredSpousePairs.has(key)) continue;
    seenSpousePairs.add(key);

    const parentMembers = [rel.fromMemberId, rel.toMemberId]
      .map((id) => memberById.get(id))
      .filter((m): m is ExportableMember => m != null);

    const { husband, wife } = assignSpouseSlots(parentMembers);

    families.push({
      xrefId: nextFamilyXref(),
      husbandXrefId: husband ? xrefMap.get(husband.id) : undefined,
      wifeXrefId: wife ? xrefMap.get(wife.id) : undefined,
      childXrefIds: [],
    });
  }

  // Sibling-only clusters: members with no recorded parents, linked by an
  // explicit sibling relationship, become a parentless FAM with CHIL.
  const siblingUnion = new UnionFind();
  for (const rel of relationships) {
    if (rel.type !== "sibling") continue;
    siblingUnion.union(rel.fromMemberId, rel.toMemberId);
  }

  const siblingGroups = [...siblingUnion.groups().values()].sort(
    (a, b) => (memberOrder.get(a[0]) ?? 0) - (memberOrder.get(b[0]) ?? 0),
  );

  for (const group of siblingGroups) {
    if (group.length < 2) continue;
    if (group.some((id) => parentsByChild.has(id))) continue;

    const childXrefIds = group
      .slice()
      .sort((a, b) => (memberOrder.get(a) ?? 0) - (memberOrder.get(b) ?? 0))
      .map((id) => xrefMap.get(id)!);

    families.push({
      xrefId: nextFamilyXref(),
      childXrefIds,
    });
  }

  return families;
}

export function mapTreeToGedcomDocument(
  members: ExportableMember[],
  relationships: ExportableRelationship[],
): GedcomDocument {
  return {
    individuals: mapMembersToGedcomIndividuals(members),
    families: mapRelationshipsToGedcomFamilies(members, relationships),
  };
}
