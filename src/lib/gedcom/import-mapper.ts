import type { GedcomNode } from "./parser";

export interface ImportedMember {
  xrefId: string;
  firstName: string;
  lastName?: string | null;
}

export interface ImportReport {
  importedCount: number;
  unknownNameCount: number;
}

const NAME_PATTERN = /^(.*?)\/(.*)\/\s*$/;

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

export function mapGedcomToMembers(records: GedcomNode[]): {
  members: ImportedMember[];
  report: ImportReport;
} {
  const membersByXref = new Map<string, ImportedMember>();
  let unknownNameCount = 0;

  for (const record of records) {
    if (record.tag !== "INDI" || !record.xrefId) continue;
    if (membersByXref.has(record.xrefId)) continue;

    const nameNode = record.children.find((child) => child.tag === "NAME");
    const { firstName, lastName } = parseGedcomName(nameNode?.value);

    if (!firstName) {
      unknownNameCount += 1;
    }

    membersByXref.set(record.xrefId, {
      xrefId: record.xrefId,
      firstName: firstName ?? "Unknown",
      lastName: lastName ?? null,
    });
  }

  const members = [...membersByXref.values()];

  return {
    members,
    report: {
      importedCount: members.length,
      unknownNameCount,
    },
  };
}
