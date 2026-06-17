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

  const spouseAdj = new Map<string, Set<string>>();
  for (const r of relationships) {
    if (r.type !== "spouse" && r.type !== "divorced") continue;
    if (!memberIds.has(r.fromMemberId) || !memberIds.has(r.toMemberId))
      continue;
    if (!spouseAdj.has(r.fromMemberId))
      spouseAdj.set(r.fromMemberId, new Set());
    if (!spouseAdj.has(r.toMemberId))
      spouseAdj.set(r.toMemberId, new Set());
    spouseAdj.get(r.fromMemberId)!.add(r.toMemberId);
    spouseAdj.get(r.toMemberId)!.add(r.fromMemberId);
  }

  const hidden = new Set<string>();
  const closureVisited = new Set<string>();
  const closureStack = [...ancestors];

  while (closureStack.length > 0) {
    const current = closureStack.pop()!;
    if (closureVisited.has(current)) continue;
    closureVisited.add(current);
    if (anchorDescendants.has(current)) continue;

    hidden.add(current);

    for (const child of childrenOf.get(current) ?? []) {
      closureStack.push(child);
    }

    for (const partner of spouseAdj.get(current) ?? []) {
      closureStack.push(partner);
    }
  }

  hidden.delete(anchorId);
  for (const spouseId of anchorSpouses) hidden.delete(spouseId);

  // Reachability rescue: a candidate-hidden member stays visible if reachable
  // from the kept set via a path that does not pass through the anchor.
  const adjacency = new Map<string, Set<string>>();
  for (const r of relationships) {
    if (!memberIds.has(r.fromMemberId) || !memberIds.has(r.toMemberId))
      continue;
    if (!adjacency.has(r.fromMemberId))
      adjacency.set(r.fromMemberId, new Set());
    if (!adjacency.has(r.toMemberId))
      adjacency.set(r.toMemberId, new Set());
    adjacency.get(r.fromMemberId)!.add(r.toMemberId);
    adjacency.get(r.toMemberId)!.add(r.fromMemberId);
  }

  const rescued = new Set<string>();
  const visited = new Set<string>();
  visited.add(anchorId);

  const queue: string[] = [];
  for (const desc of anchorDescendants) {
    if (desc === anchorId) continue;
    queue.push(desc);
    visited.add(desc);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      if (hidden.has(neighbor)) {
        if (!ancestors.has(neighbor)) {
          rescued.add(neighbor);
          queue.push(neighbor);
        }
      } else {
        queue.push(neighbor);
      }
    }
  }

  for (const id of rescued) {
    hidden.delete(id);
  }

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
