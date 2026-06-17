import {
  buildTreeGraph,
  type TreeArrangement,
  type TreeFlowEdge,
  type TreeFlowNode,
  type TreeMemberData,
  type TreeRelationship,
} from "./tree-layout";
import { computePerAnchorHiddenCounts } from "./collapse-branch";

export function buildVisibleGraph(
  members: TreeMemberData[],
  relationships: TreeRelationship[],
  hiddenIds: Set<string>,
  arrangement?: TreeArrangement | null,
  collapsedAnchors: string[] = [],
): {
  nodes: TreeFlowNode[];
  edges: TreeFlowEdge[];
  hiddenCounts: Map<string, number>;
} {
  // Per-anchor hidden counts feed the Hidden Relatives Badge and are computed
  // against the full data (not the filtered subset), so the badge "+N" reflects
  // how many relatives each anchor is hiding.
  const hiddenCounts = computePerAnchorHiddenCounts(
    collapsedAnchors,
    members,
    relationships,
  );

  if (hiddenIds.size === 0) {
    return { ...buildTreeGraph(members, relationships, arrangement), hiddenCounts };
  }

  const visibleMembers = members.filter((m) => !hiddenIds.has(m.id));
  const visibleRelationships = relationships.filter(
    (r) => !hiddenIds.has(r.fromMemberId) && !hiddenIds.has(r.toMemberId),
  );

  return {
    ...buildTreeGraph(visibleMembers, visibleRelationships, arrangement),
    hiddenCounts,
  };
}
