import type { TreeMemberData, TreeRelationship } from "./tree-layout";

export function computeHiddenSet(
  anchorId: string,
  members: TreeMemberData[],
  relationships: TreeRelationship[],
): Set<string> {
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(anchorId)) return new Set();

  const parentRels = relationships.filter((r) => r.type === "parent");

  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  for (const r of parentRels) {
    if (!memberIds.has(r.fromMemberId) || !memberIds.has(r.toMemberId))
      continue;
    if (!parentsOf.has(r.toMemberId)) parentsOf.set(r.toMemberId, new Set());
    parentsOf.get(r.toMemberId)!.add(r.fromMemberId);
    if (!childrenOf.has(r.fromMemberId))
      childrenOf.set(r.fromMemberId, new Set());
    childrenOf.get(r.fromMemberId)!.add(r.toMemberId);
  }

  if (!parentsOf.has(anchorId) || parentsOf.get(anchorId)!.size === 0)
    return new Set();

  const anchorDescendants = new Set<string>();
  const descStack = [anchorId];
  while (descStack.length > 0) {
    const current = descStack.pop()!;
    if (anchorDescendants.has(current)) continue;
    anchorDescendants.add(current);
    for (const child of childrenOf.get(current) ?? []) {
      descStack.push(child);
    }
  }

  const anchorSpouses = new Set<string>();
  for (const r of relationships) {
    if (r.type !== "spouse" && r.type !== "divorced") continue;
    if (r.fromMemberId === anchorId) anchorSpouses.add(r.toMemberId);
    if (r.toMemberId === anchorId) anchorSpouses.add(r.fromMemberId);
  }

  const ancestors = new Set<string>();
  const ancStack = [...(parentsOf.get(anchorId) ?? [])];
  while (ancStack.length > 0) {
    const current = ancStack.pop()!;
    if (ancestors.has(current)) continue;
    ancestors.add(current);
    for (const parent of parentsOf.get(current) ?? []) {
      ancStack.push(parent);
    }
  }

  const hidden = new Set<string>();
  for (const anc of ancestors) {
    hidden.add(anc);
    const stack = [anc];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const child of childrenOf.get(current) ?? []) {
        if (!anchorDescendants.has(child)) {
          hidden.add(child);
          stack.push(child);
        }
      }
    }
  }

  hidden.delete(anchorId);
  for (const spouseId of anchorSpouses) hidden.delete(spouseId);

  return hidden;
}

export function computeMultiAnchorHiddenSet(
  anchorIds: string[],
  members: TreeMemberData[],
  relationships: TreeRelationship[],
): Set<string> {
  const memberIds = new Set(members.map((m) => m.id));
  const result = new Set<string>();
  for (const anchorId of anchorIds) {
    if (!memberIds.has(anchorId)) continue;
    for (const id of computeHiddenSet(anchorId, members, relationships)) {
      result.add(id);
    }
  }
  return result;
}

export function computePerAnchorHiddenCounts(
  anchorIds: string[],
  members: TreeMemberData[],
  relationships: TreeRelationship[],
): Map<string, number> {
  const memberIds = new Set(members.map((m) => m.id));
  const counts = new Map<string, number>();
  for (const anchorId of anchorIds) {
    if (!memberIds.has(anchorId)) continue;
    counts.set(
      anchorId,
      computeHiddenSet(anchorId, members, relationships).size,
    );
  }
  return counts;
}
