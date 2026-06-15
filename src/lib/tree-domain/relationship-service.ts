import {
  canonicalizeRelationship,
  type RelationshipInput,
} from "./relationship-canonical";
import { canEditMembers, type TreeRole } from "./tree-access";

type CanonicalRelationshipType = "parent" | "spouse" | "divorced" | "sibling";

export async function createRelationship(params: {
  repo: {
    getRole: (treeId: string, userId: string) => Promise<TreeRole>;
    hasRelationship: (args: {
      treeId: string;
      fromMemberId: string;
      toMemberId: string;
      type: CanonicalRelationshipType;
    }) => Promise<boolean>;
    createRelationshipRecord: (args: {
      treeId: string;
      fromMemberId: string;
      toMemberId: string;
      type: CanonicalRelationshipType;
    }) => Promise<{ id: string; type: string }>;
  };
  actorUserId: string;
  treeId: string;
  input: RelationshipInput;
}): Promise<{ id: string; type: string }> {
  const role = await params.repo.getRole(params.treeId, params.actorUserId);
  if (!canEditMembers(role)) {
    throw new Error("ERR_FORBIDDEN");
  }

  const canonical = canonicalizeRelationship(params.input);
  const exists = await params.repo.hasRelationship({
    treeId: params.treeId,
    fromMemberId: canonical.fromMemberId,
    toMemberId: canonical.toMemberId,
    type: canonical.type,
  });

  if (exists) {
    throw new Error("ERR_DUPLICATE_RELATIONSHIP");
  }

  return params.repo.createRelationshipRecord({
    treeId: params.treeId,
    fromMemberId: canonical.fromMemberId,
    toMemberId: canonical.toMemberId,
    type: canonical.type,
  });
}
