import { parseGedcom } from "./parser";
import {
  mapGedcomToMembers,
  type ImportedMember,
  type ImportedRelationship,
  type ImportReport,
} from "./import-mapper";

export interface ImportGedcomResult {
  treeId: string;
  report: ImportReport;
}

export function deriveTreeName(fileName: string | null | undefined): string {
  if (!fileName) return "Imported Tree";

  const base = fileName.replace(/\.[^./\\]+$/, "").trim();
  return base || "Imported Tree";
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
  fileContent: string;
}): Promise<ImportGedcomResult> {
  const records = parseGedcom(params.fileContent);
  const { members, relationships, report } = mapGedcomToMembers(records);

  const { treeId } = await params.repo.createTreeWithMembers({
    ownerId: params.actorUserId,
    name: deriveTreeName(params.fileName),
    members,
    relationships,
  });

  return { treeId, report };
}
