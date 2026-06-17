import { randomUUID } from "crypto";
import type { GedcomNode } from "./parser";
import {
  canonicalizeRelationship,
  type CanonicalRelationship,
} from "../tree-domain/relationship-canonical";

export type ImportedGender = "male" | "female" | "other" | "undisclosed";
export type ImportedDatePrecision = "year" | "month" | "day";

export interface ImportedMember {
  id: string;
  xrefId: string;
  firstName: string;
  lastName?: string | null;
  maidenName?: string | null;
  gender: ImportedGender;
  isLiving: boolean;
  birthPrecision?: ImportedDatePrecision | null;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathPrecision?: ImportedDatePrecision | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  bio?: string | null;
}

export type ImportedRelationshipType =
  | "parent"
  | "spouse"
  | "divorced"
  | "sibling";

export interface ImportedRelationship {
  fromMemberId: string;
  toMemberId: string;
  type: ImportedRelationshipType;
}

export interface ImportReport {
  importedCount: number;
  unknownNameCount: number;
  relationshipCount: number;
  droppedDateCount: number;
  inferredLivingCount: number;
  danglingRelationshipCount: number;
  skippedPlacesCount: number;
  skippedEventsCount: number;
  skippedSourcesCount: number;
  skippedNotesCount: number;
}

const NAME_PATTERN = /^(.*?)\/(.*)\/\s*$/;
const XREF_PATTERN = /^@(.+)@$/;
const LIVING_AGE_LIMIT_YEARS = 100;
/** Matches the Member.bio column limit (`@db.VarChar(1000)`). */
const BIO_MAX_LENGTH = 1000;

/**
 * GEDCOM event tags (individual and family) that the app does not store.
 * BIRT/DEAT are excluded since they are mapped to dates separately.
 */
const SKIPPED_EVENT_TAGS = new Set([
  "CHR",
  "BURI",
  "CREM",
  "ADOP",
  "BAPM",
  "BARM",
  "BASM",
  "BLES",
  "CONF",
  "FCOM",
  "ORDN",
  "NATU",
  "EMIG",
  "IMMI",
  "CENS",
  "PROB",
  "WILL",
  "GRAD",
  "RETI",
  "EVEN",
  "MARR",
  "MARB",
  "MARC",
  "MARL",
  "MARS",
  "ANUL",
  "DIVF",
  "ENGA",
  "RESI",
  "CAST",
  "DSCR",
  "EDUC",
  "IDNO",
  "NATI",
  "NCHI",
  "NMR",
  "OCCU",
  "PROP",
  "RELI",
  "SSN",
  "TITL",
  "FACT",
]);

interface SkippedCounts {
  places: number;
  events: number;
  sources: number;
  notes: number;
}

/**
 * Counts unmapped data (places, events, source citations, notes) under
 * INDI/FAM records so the Import Report can be honest about what was
 * dropped, per the "unmapped data is dropped and reported" rule. Notes
 * already consumed as a member's bio are excluded so they are not
 * double-reported as skipped.
 */
function countSkippedData(
  records: GedcomNode[],
  consumedNotes: Set<GedcomNode>,
): SkippedCounts {
  const counts: SkippedCounts = { places: 0, events: 0, sources: 0, notes: 0 };

  function walk(node: GedcomNode, isEventContainer: boolean): void {
    for (const child of node.children) {
      if (child.tag === "PLAC") counts.places += 1;
      else if (child.tag === "SOUR") counts.sources += 1;
      else if (child.tag === "NOTE") {
        if (!consumedNotes.has(child)) counts.notes += 1;
      } else if (isEventContainer && SKIPPED_EVENT_TAGS.has(child.tag))
        counts.events += 1;

      walk(child, false);
    }
  }

  for (const record of records) {
    if (record.tag === "INDI" || record.tag === "FAM") {
      walk(record, true);
    }
  }

  return counts;
}

const GEDCOM_MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function parseGedcomName(raw: string | undefined): {
  firstName?: string;
  lastName?: string;
} {
  if (!raw) return {};

  const match = raw.match(NAME_PATTERN);
  if (match) {
    const givenName = match[1].trim();
    const surname = match[2].trim();
    return {
      firstName: givenName || undefined,
      lastName: surname || undefined,
    };
  }

  const givenName = raw.trim();
  return { firstName: givenName || undefined };
}

function mapGender(raw: string | undefined): ImportedGender {
  switch ((raw ?? "").trim().toUpperCase()) {
    case "M":
      return "male";
    case "F":
      return "female";
    case "X":
      return "other";
    default:
      return "undisclosed";
  }
}

function extractXrefId(value: string): string | undefined {
  const match = value.trim().match(XREF_PATTERN);
  return match ? match[1] : undefined;
}

interface ParsedDate {
  precision: ImportedDatePrecision;
  year: number;
  month?: number;
  day?: number;
}

/**
 * Maps a GEDCOM DATE value per the import fidelity table: exact dates keep
 * their precision; ABT/EST/CAL collapse to year; BEF/AFT/BET..AND/FROM..TO
 * are dropped (`null`) since they are bounds, not honest single points.
 */
function parseGedcomDate(raw: string | undefined): ParsedDate | null | undefined {
  if (!raw) return undefined;

  const value = raw.trim().toUpperCase();
  if (!value) return undefined;

  if (/^(BEF|AFT)\b/.test(value)) return null;
  if (/^BET\b.*\bAND\b/.test(value)) return null;
  if (/^FROM\b.*\bTO\b/.test(value)) return null;

  let working = value;
  let yearOnly = false;
  const approxMatch = working.match(/^(?:ABT|EST|CAL)\s+(.*)$/);
  if (approxMatch) {
    yearOnly = true;
    working = approxMatch[1];
  }

  let match = working.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{1,4})$/);
  if (match) {
    const month = GEDCOM_MONTHS[match[2]];
    const year = Number(match[3]);
    if (month && year) {
      if (yearOnly) return { precision: "year", year };
      return { precision: "day", year, month, day: Number(match[1]) };
    }
  }

  match = working.match(/^([A-Z]{3})\s+(\d{1,4})$/);
  if (match) {
    const month = GEDCOM_MONTHS[match[1]];
    const year = Number(match[2]);
    if (month && year) {
      if (yearOnly) return { precision: "year", year };
      return { precision: "month", year, month };
    }
  }

  match = working.match(/^(\d{1,4})$/);
  if (match) {
    return { precision: "year", year: Number(match[1]) };
  }

  return undefined;
}

export function mapGedcomToMembers(records: GedcomNode[]): {
  members: ImportedMember[];
  relationships: ImportedRelationship[];
  report: ImportReport;
} {
  const membersByXref = new Map<string, ImportedMember>();
  const consumedNotes = new Set<GedcomNode>();
  let unknownNameCount = 0;
  let droppedDateCount = 0;
  let inferredLivingCount = 0;

  const currentYear = new Date().getFullYear();

  for (const record of records) {
    if (record.tag !== "INDI" || !record.xrefId) continue;
    if (membersByXref.has(record.xrefId)) continue;

    const nameNodes = record.children.filter((child) => child.tag === "NAME");
    const primaryNameNode = nameNodes.find(
      (n) =>
        !n.children.some(
          (c) => c.tag === "TYPE" && c.value.trim().toLowerCase() === "maiden",
        ),
    );
    const maidenNameNode = nameNodes.find((n) =>
      n.children.some(
        (c) => c.tag === "TYPE" && c.value.trim().toLowerCase() === "maiden",
      ),
    );

    const { firstName, lastName } = parseGedcomName(primaryNameNode?.value);
    const maidenParsed = parseGedcomName(maidenNameNode?.value);

    if (!firstName) {
      unknownNameCount += 1;
    }

    const sexNode = record.children.find((child) => child.tag === "SEX");
    const gender = mapGender(sexNode?.value);

    const birtNode = record.children.find((child) => child.tag === "BIRT");
    const deatNode = record.children.find((child) => child.tag === "DEAT");

    const birthDateNode = birtNode?.children.find(
      (child) => child.tag === "DATE",
    );
    const deathDateNode = deatNode?.children.find(
      (child) => child.tag === "DATE",
    );

    const birthDate = parseGedcomDate(birthDateNode?.value);
    const deathDate = parseGedcomDate(deathDateNode?.value);

    if (birthDate === null) droppedDateCount += 1;
    if (deathDate === null) droppedDateCount += 1;

    const isLiving =
      !deatNode &&
      birthDate != null &&
      currentYear - birthDate.year <= LIVING_AGE_LIMIT_YEARS;

    if (isLiving) {
      inferredLivingCount += 1;
    }

    const noteNode = record.children.find((child) => child.tag === "NOTE");
    const noteText = noteNode?.value.trim();
    let bio: string | null = null;
    if (noteNode && noteText) {
      bio = noteText.slice(0, BIO_MAX_LENGTH);
      consumedNotes.add(noteNode);
    }

    membersByXref.set(record.xrefId, {
      id: randomUUID(),
      xrefId: record.xrefId,
      firstName: firstName ?? "Unknown",
      lastName: lastName ?? null,
      maidenName: maidenParsed.lastName ?? null,
      gender,
      isLiving,
      birthPrecision: birthDate?.precision ?? null,
      birthYear: birthDate?.year ?? null,
      birthMonth: birthDate?.month ?? null,
      birthDay: birthDate?.day ?? null,
      deathPrecision: deathDate?.precision ?? null,
      deathYear: deathDate?.year ?? null,
      deathMonth: deathDate?.month ?? null,
      deathDay: deathDate?.day ?? null,
      bio,
    });
  }

  const members = [...membersByXref.values()];

  const seenRelationships = new Set<string>();
  const canonicalRelationships: CanonicalRelationship[] = [];

  function addRelationship(
    fromXrefId: string,
    toXrefId: string,
    type: ImportedRelationshipType,
  ): void {
    if (fromXrefId === toXrefId) return;

    const canonical = canonicalizeRelationship({
      fromMemberId: fromXrefId,
      toMemberId: toXrefId,
      type,
    });
    const key = `${canonical.type}:${canonical.fromMemberId}:${canonical.toMemberId}`;
    if (seenRelationships.has(key)) return;
    seenRelationships.add(key);
    canonicalRelationships.push(canonical);
  }

  for (const record of records) {
    if (record.tag !== "FAM") continue;

    const husbXrefId = extractXrefId(
      record.children.find((child) => child.tag === "HUSB")?.value ?? "",
    );
    const wifeXrefId = extractXrefId(
      record.children.find((child) => child.tag === "WIFE")?.value ?? "",
    );
    const childXrefIds = record.children
      .filter((child) => child.tag === "CHIL")
      .map((child) => extractXrefId(child.value))
      .filter((xrefId): xrefId is string => !!xrefId);

    const parentXrefIds = [husbXrefId, wifeXrefId].filter(
      (xrefId): xrefId is string => !!xrefId,
    );

    for (const childXrefId of childXrefIds) {
      for (const parentXrefId of parentXrefIds) {
        addRelationship(parentXrefId, childXrefId, "parent");
      }
    }

    if (parentXrefIds.length === 2) {
      const hasDiv = record.children.some((child) => child.tag === "DIV");
      addRelationship(
        parentXrefIds[0],
        parentXrefIds[1],
        hasDiv ? "divorced" : "spouse",
      );
    }

    if (parentXrefIds.length === 0 && childXrefIds.length >= 2) {
      for (let i = 0; i < childXrefIds.length; i += 1) {
        for (let j = i + 1; j < childXrefIds.length; j += 1) {
          addRelationship(childXrefIds[i], childXrefIds[j], "sibling");
        }
      }
    }
  }

  let danglingRelationshipCount = 0;
  const relationships: ImportedRelationship[] = [];

  for (const rel of canonicalRelationships) {
    const fromMember = membersByXref.get(rel.fromMemberId);
    const toMember = membersByXref.get(rel.toMemberId);

    if (!fromMember || !toMember) {
      danglingRelationshipCount += 1;
      continue;
    }

    relationships.push({
      fromMemberId: fromMember.id,
      toMemberId: toMember.id,
      type: rel.type,
    });
  }

  const skipped = countSkippedData(records, consumedNotes);

  return {
    members,
    relationships,
    report: {
      importedCount: members.length,
      unknownNameCount,
      relationshipCount: relationships.length,
      droppedDateCount,
      inferredLivingCount,
      danglingRelationshipCount,
      skippedPlacesCount: skipped.places,
      skippedEventsCount: skipped.events,
      skippedSourcesCount: skipped.sources,
      skippedNotesCount: skipped.notes,
    },
  };
}
