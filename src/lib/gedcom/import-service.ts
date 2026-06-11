import { parseGedcom, type GedcomNode } from "./parser";
import { decodeGedcomBuffer, isSupportedCharset } from "./encoding";
import { MEMBER_HARD_LIMIT } from "../tree-domain/member-service";
import {
  mapGedcomToMembers,
  type ImportedMember,
  type ImportedRelationship,
  type ImportReport,
} from "./import-mapper";

export const MAX_GEDCOM_FILE_BYTES = 5 * 1024 * 1024;

export type GedcomImportErrorCode =
  | "ERR_FILE_TOO_LARGE"
  | "ERR_TOO_MANY_MEMBERS"
  | "ERR_UNSUPPORTED_ENCODING"
  | "ERR_INVALID_GEDCOM";

export class GedcomImportError extends Error {
  code: GedcomImportErrorCode;

  constructor(code: GedcomImportErrorCode, message: string) {
    super(message);
    this.name = "GedcomImportError";
    this.code = code;
  }
}

export interface ImportGedcomResult {
  treeId: string;
  report: ImportReport;
}

export function deriveTreeName(fileName: string | null | undefined): string {
  if (!fileName) return "Imported Tree";

  const base = fileName.replace(/\.[^./\\]+$/, "").trim();
  return base || "Imported Tree";
}

function findCharset(records: GedcomNode[]): string | undefined {
  const head = records.find((record) => record.tag === "HEAD");
  return head?.children.find((child) => child.tag === "CHAR")?.value;
}

export async function importGedcomTree(params: {
  repo: {
    createTreeWithMembers: (args: {
      ownerId: string;
      name: string;
      members: ImportedMember[];
      relationships: ImportedRelationship[];
    }) => Promise<{ treeId: string }>;
  };
  actorUserId: string;
  fileName: string | null | undefined;
  fileBuffer: ArrayBuffer;
}): Promise<ImportGedcomResult> {
  if (params.fileBuffer.byteLength > MAX_GEDCOM_FILE_BYTES) {
    const limitMb = MAX_GEDCOM_FILE_BYTES / (1024 * 1024);
    throw new GedcomImportError(
      "ERR_FILE_TOO_LARGE",
      `The file exceeds the ${limitMb}MB import size limit.`,
    );
  }

  const text = decodeGedcomBuffer(params.fileBuffer);
  if (text === null) {
    throw new GedcomImportError(
      "ERR_UNSUPPORTED_ENCODING",
      "The file's text encoding is not supported. Please re-export it as UTF-8.",
    );
  }

  const records = parseGedcom(text);
  if (records.length === 0) {
    throw new GedcomImportError(
      "ERR_INVALID_GEDCOM",
      "The file does not contain any valid GEDCOM records.",
    );
  }

  const charset = findCharset(records);
  if (!isSupportedCharset(charset)) {
    throw new GedcomImportError(
      "ERR_UNSUPPORTED_ENCODING",
      `The file declares an unsupported character encoding (${charset}). Please re-export it as UTF-8.`,
    );
  }

  const individualCount = records.filter(
    (record) => record.tag === "INDI" && record.xrefId,
  ).length;
  if (individualCount > MEMBER_HARD_LIMIT) {
    throw new GedcomImportError(
      "ERR_TOO_MANY_MEMBERS",
      `This file declares ${individualCount} individuals, which exceeds the ${MEMBER_HARD_LIMIT}-member import limit.`,
    );
  }

  const { members, relationships, report } = mapGedcomToMembers(records);

  const { treeId } = await params.repo.createTreeWithMembers({
    ownerId: params.actorUserId,
    name: deriveTreeName(params.fileName),
    members,
    relationships,
  });

  return { treeId, report };
}
