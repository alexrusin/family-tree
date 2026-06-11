import {
  mapTreeToGedcomDocument,
  type ExportableMember,
  type ExportableRelationship,
} from "@/lib/gedcom/export-mapper";
import { serializeGedcom } from "@/lib/gedcom/serializer";
import type { TreeRole } from "./tree-access";

export function buildGedcomFilename(treeName: string): string {
  const slug = treeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "family-tree"}.ged`;
}

export async function exportTreeAsGedcom(params: {
  repo: {
    getRole: (treeId: string, userId: string) => Promise<TreeRole>;
    getTree: (treeId: string) => Promise<{ id: string; name: string } | null>;
    getMembers: (treeId: string) => Promise<ExportableMember[]>;
    getRelationships: (treeId: string) => Promise<ExportableRelationship[]>;
  };
  treeId: string;
  actorUserId: string;
}): Promise<{ content: string; filename: string }> {
  const role = await params.repo.getRole(params.treeId, params.actorUserId);
  if (role === "none") {
    throw new Error("ERR_FORBIDDEN");
  }

  const tree = await params.repo.getTree(params.treeId);
  if (!tree) {
    throw new Error("ERR_NOT_FOUND");
  }

  const members = await params.repo.getMembers(params.treeId);
  const relationships = await params.repo.getRelationships(params.treeId);
  const document = mapTreeToGedcomDocument(members, relationships);
  const content = serializeGedcom(document);

  return { content, filename: buildGedcomFilename(tree.name) };
}
