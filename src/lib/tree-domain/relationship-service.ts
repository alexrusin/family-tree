import {
  canonicalizeRelationship,
  OPPOSITE_STATUS_TYPE,
  type RelationshipInput,
} from "./relationship-canonical";
import { canEditMembers, type TreeRole } from "./tree-access";
import { DomainError } from "@/lib/domain-error";

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
    findRelationship: (args: {
      treeId: string;
      fromMemberId: string;
      toMemberId: string;
      type: CanonicalRelationshipType;
    }) => Promise<{ id: string } | null>;
    createRelationshipRecord: (args: {
      treeId: string;
      fromMemberId: string;
      toMemberId: string;
      type: CanonicalRelationshipType;
      deleteOppositeId?: string;
    }) => Promise<{ id: string; type: string }>;
  };
  actorUserId: string;
  treeId: string;
  input: RelationshipInput;
}): Promise<{ id: string; type: string }> {
  const role = await params.repo.getRole(params.treeId, params.actorUserId);
  if (!canEditMembers(role)) {
    throw new DomainError("ERR_FORBIDDEN");
  }

  const canonical = canonicalizeRelationship(params.input);
  const exists = await params.repo.hasRelationship({
    treeId: params.treeId,
    fromMemberId: canonical.fromMemberId,
    toMemberId: canonical.toMemberId,
    type: canonical.type,
  });

  if (exists) {
    throw new DomainError("ERR_DUPLICATE_RELATIONSHIP");
  }

  const oppositeType = OPPOSITE_STATUS_TYPE[canonical.type];
  let deleteOppositeId: string | undefined;
  if (oppositeType) {
    const opposite = await params.repo.findRelationship({
      treeId: params.treeId,
      fromMemberId: canonical.fromMemberId,
      toMemberId: canonical.toMemberId,
      type: oppositeType,
    });

    if (opposite) {
      deleteOppositeId = opposite.id;
    }
  }

  // Delete-opposite + create must be atomic so a mid-swap failure can never
  // leave the pair with neither relationship (ADR-0002).
  return params.repo.createRelationshipRecord({
    treeId: params.treeId,
    fromMemberId: canonical.fromMemberId,
    toMemberId: canonical.toMemberId,
    type: canonical.type,
    deleteOppositeId,
  });
}
