import {
  buildTreeGraph,
  type TreeArrangement,
  type TreeFlowEdge,
  type TreeFlowNode,
  type TreeMemberData,
  type TreeRelationship,
} from "./tree-layout";

export function buildVisibleGraph(
  members: TreeMemberData[],
  relationships: TreeRelationship[],
  hiddenIds: Set<string>,
  arrangement?: TreeArrangement | null,
): { nodes: TreeFlowNode[]; edges: TreeFlowEdge[] } {
  if (hiddenIds.size === 0) {
    return buildTreeGraph(members, relationships, arrangement);
  }

  const visibleMembers = members.filter((m) => !hiddenIds.has(m.id));
  const visibleRelationships = relationships.filter(
    (r) => !hiddenIds.has(r.fromMemberId) && !hiddenIds.has(r.toMemberId),
  );

  return buildTreeGraph(visibleMembers, visibleRelationships, arrangement);
}
