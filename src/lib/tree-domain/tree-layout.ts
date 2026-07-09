// src/lib/tree-domain/tree-layout.ts
import Dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

export interface MemberPosition {
  x: number;
  y: number;
}

/** Persisted workspace positions for member nodes, keyed by member ID. */
export type TreeArrangement = Record<string, MemberPosition>;

/**
 * Returns a new arrangement that contains only the entries whose keys are
 * present in `remainingMemberIds`. Use this after deleting a member to keep
 * the stored arrangement in sync with the current tree members.
 */
export function pruneArrangement(
  arrangement: TreeArrangement,
  remainingMemberIds: Set<string>,
): TreeArrangement {
  return Object.fromEntries(
    Object.entries(arrangement).filter(([id]) => remainingMemberIds.has(id)),
  );
}

/**
 * Runtime guard for values loaded from the database or received over the
 * network. Rejects any value that is not a plain object whose entries all
 * carry finite numeric `x`/`y` coordinates.
 */
export function isValidArrangement(value: unknown): value is TreeArrangement {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  for (const pos of Object.values(value as Record<string, unknown>)) {
    if (typeof pos !== "object" || pos === null) return false;
    const { x, y } = pos as Record<string, unknown>;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  }
  return true;
}

export interface TreeMemberData {
  id: string;
  firstName: string;
  lastName: string | null;
  maidenName: string | null;
  isLiving: boolean;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthPrecision: string | null;
  deathYear: number | null;
  deathMonth: number | null;
  deathDay: number | null;
  deathPrecision: string | null;
  photoUrl: string | null;
  bio: string | null;
  gender: string;
}

export interface TreeRelationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: "parent" | "spouse" | "divorced" | "sibling";
}

export type MemberNodeData = { member: TreeMemberData; hiddenCount?: number; onBadgeClick?: (memberId: string) => void; badgeLabel?: string };
export type UnionNodeData = { spouseIds: [string, string] };
export type TreeFlowNode =
  | Node<MemberNodeData, "member">
  | Node<UnionNodeData, "union">;
export type TreeFlowEdge =
  | Edge<{ relationshipId?: string; relationshipIds?: string[] }, "parent">
  | Edge<{ relationshipId: string }, "spouse">
  | Edge<{ relationshipId: string }, "divorced">;

export const NODE_W = 120;
export const NODE_H = 150;
const UNION_SIZE = 8;

/**
 * Position a union node at the horizontal midpoint of its two spouse members,
 * just below the lower of the two. Shared by the initial layout and the live
 * drag sync so the formula stays in one place.
 */
export function computeUnionPosition(
  pa: MemberPosition,
  pb: MemberPosition,
): MemberPosition {
  return {
    x: (pa.x + pb.x) / 2 + NODE_W / 2 - UNION_SIZE / 2,
    y: Math.max(pa.y, pb.y) + NODE_H - UNION_SIZE / 2,
  };
}

/**
 * Re-pin every union node to sit below its two spouse members based on those
 * members' current positions. React Flow does not move derived (union) nodes
 * when their parents are dragged, so this is called on every node change to
 * keep unions glued to their parents during a drag instead of jumping into
 * place only after the drag ends. Returns the same array reference when nothing
 * moved, so it is safe to call on every change.
 */
export function syncUnionPositions(nodes: TreeFlowNode[]): TreeFlowNode[] {
  const memberPositions = new Map<string, MemberPosition>();
  for (const node of nodes) {
    if (node.type === "member") memberPositions.set(node.id, node.position);
  }

  let changed = false;
  const next = nodes.map((node) => {
    if (node.type !== "union") return node;
    const [a, b] = node.data.spouseIds;
    const pa = memberPositions.get(a);
    const pb = memberPositions.get(b);
    if (!pa || !pb) return node;
    const target = computeUnionPosition(pa, pb);
    if (node.position.x === target.x && node.position.y === target.y) {
      return node;
    }
    changed = true;
    return { ...node, position: target };
  });

  return changed ? next : nodes;
}
export const SPOUSE_LEFT_SOURCE_HANDLE = "spouse-left-source";
export const SPOUSE_LEFT_TARGET_HANDLE = "spouse-left-target";
export const SPOUSE_RIGHT_SOURCE_HANDLE = "spouse-right-source";
export const SPOUSE_RIGHT_TARGET_HANDLE = "spouse-right-target";

export function buildTreeGraph(
  members: TreeMemberData[],
  relationships: TreeRelationship[],
  arrangement?: TreeArrangement | null,
): { nodes: TreeFlowNode[]; edges: TreeFlowEdge[] } {
  if (members.length === 0) return { nodes: [], edges: [] };

  const parentRels = relationships.filter((r) => r.type === "parent");
  const spouseRels = relationships.filter((r) => r.type === "spouse");
  const divorcedRels = relationships.filter((r) => r.type === "divorced");

  const memberIds = new Set(members.map((m) => m.id));

  // ── Parent → children & child → parents maps ──────────────────────────
  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  const parentRelIdByPair = new Map<string, string>();
  for (const r of parentRels) {
    if (!childrenOf.has(r.fromMemberId))
      childrenOf.set(r.fromMemberId, new Set());
    childrenOf.get(r.fromMemberId)!.add(r.toMemberId);
    if (!parentsOf.has(r.toMemberId)) parentsOf.set(r.toMemberId, new Set());
    parentsOf.get(r.toMemberId)!.add(r.fromMemberId);
    parentRelIdByPair.set(`${r.fromMemberId}::${r.toMemberId}`, r.id);
  }

  // ── Unions (spouse/divorced pairs with shared children) ───────────────
  // Detected up front so the marriage point can drive the Dagre hierarchy,
  // not just the rendered edges.
  const unionMap = new Map<
    string,
    { spouseA: string; spouseB: string; children: Set<string> }
  >();
  const couplePairRelId = new Map<string, string>();
  const couplePairType = new Map<string, "spouse" | "divorced">();
  const coupleRels = [...spouseRels, ...divorcedRels];

  for (const r of coupleRels) {
    const [a, b] = [r.fromMemberId, r.toMemberId].sort();
    const key = `${a}::${b}`;
    couplePairRelId.set(key, r.id);
    couplePairType.set(key, r.type as "spouse" | "divorced");
    const kidsA = childrenOf.get(a) ?? new Set<string>();
    const kidsB = childrenOf.get(b) ?? new Set<string>();
    const kids = new Set([...kidsA].filter((k) => kidsB.has(k)));
    if (kids.size === 0) continue;
    unionMap.set(key, { spouseA: a, spouseB: b, children: kids });
  }

  // ── Dagre layout ──────────────────────────────────────────────────────
  // Every parent → child link is routed through an intermediate node so that
  // *every* generation spans exactly the same number of ranks (2). This is the
  // key to keeping generations on one level: if some children hung directly off
  // a parent (1 rank) while others hung under a couple's union node (2 ranks),
  // branches would drift half a generation out of alignment wherever the two
  // meet (e.g. through a marriage). Couples with shared children funnel through
  // one shared union node; every other child (single parent, or co-parents who
  // are not a registered couple) gets a per-child group node. These
  // intermediates are layout-only — they are not rendered.
  //
  // Anchoring *every* couple (even childless ones) is likewise essential: a
  // married-in spouse with no children would otherwise be disconnected and
  // dagre would float it to the top row.
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    ranksep: 40,
    nodesep: 40,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const m of members) g.setNode(m.id, { width: NODE_W, height: NODE_H });

  // Couple union nodes (shared by the couple's children).
  const unionChildren = new Set<string>();
  const seenCoupleKeys = new Set<string>();
  for (const r of coupleRels) {
    const [a, b] = [r.fromMemberId, r.toMemberId].sort();
    const key = `${a}::${b}`;
    if (seenCoupleKeys.has(key)) continue;
    seenCoupleKeys.add(key);
    if (!memberIds.has(a) || !memberIds.has(b)) continue;
    const layoutId = `ulayout-${key}`;
    g.setNode(layoutId, { width: UNION_SIZE, height: 1 });
    g.setEdge(a, layoutId);
    g.setEdge(b, layoutId);
    const union = unionMap.get(key);
    if (union) {
      for (const cid of union.children) {
        if (memberIds.has(cid)) {
          g.setEdge(layoutId, cid);
          unionChildren.add(cid);
        }
      }
    }
  }
  // Every child not funnelled through a couple union gets a per-child group
  // node, so its parent(s) sit exactly 2 ranks above it — same as union kids.
  for (const [child, parents] of parentsOf) {
    if (!memberIds.has(child) || unionChildren.has(child)) continue;
    const groupId = `pgroup-${child}`;
    g.setNode(groupId, { width: UNION_SIZE, height: 1 });
    for (const p of parents) {
      if (memberIds.has(p)) g.setEdge(p, groupId);
    }
    g.setEdge(groupId, child);
  }
  Dagre.layout(g);

  // Extract top-left positions (dagre uses center coords)
  // Saved arrangement positions take precedence over Dagre-computed ones.
  const pos = new Map<string, { x: number; y: number }>();
  for (const m of members) {
    const p = g.node(m.id);
    const autoPos = { x: (p?.x ?? 0) - NODE_W / 2, y: (p?.y ?? 0) - NODE_H / 2 };
    const saved = arrangement?.[m.id];
    pos.set(m.id, saved !== undefined ? saved : autoPos);
  }

  // ── Member nodes ──────────────────────────────────────────────────────
  const memberNodes: TreeFlowNode[] = members.map((m) => ({
    id: m.id,
    type: "member" as const,
    position: pos.get(m.id)!,
    data: { member: m },
  }));

  // ── Rendered union nodes (positioned from the two spouses) ────────────
  const unionNodes: TreeFlowNode[] = [];
  for (const [key, { spouseA, spouseB }] of unionMap) {
    const pa = pos.get(spouseA);
    const pb = pos.get(spouseB);
    if (!pa || !pb) {
      unionMap.delete(key);
      continue;
    }
    const { x: ux, y: uy } = computeUnionPosition(pa, pb);
    unionNodes.push({
      id: `union-${key}`,
      type: "union" as const,
      position: { x: ux, y: uy },
      draggable: false,
      selectable: false,
      data: { spouseIds: [spouseA, spouseB] as [string, string] },
    });
  }

  // ── Edges ─────────────────────────────────────────────────────────────
  const edges: TreeFlowEdge[] = [];
  const handledPairs = new Set<string>();

  // Union → child edges (virtual, no relationshipId)
  for (const [key, { spouseA, spouseB, children }] of unionMap) {
    const uid = `union-${key}`;
    for (const cid of children) {
      const relationshipIds = [
        parentRelIdByPair.get(`${spouseA}::${cid}`),
        parentRelIdByPair.get(`${spouseB}::${cid}`),
      ].filter((id): id is string => Boolean(id));
      edges.push({
        id: `e-${uid}-${cid}`,
        source: uid,
        target: cid,
        type: "parent" as const,
        data: {
          relationshipId: relationshipIds[0],
          relationshipIds,
        },
      });
      handledPairs.add(`${spouseA}::${cid}`);
      handledPairs.add(`${spouseB}::${cid}`);
    }
    const relId = couplePairRelId.get(key)!;
    const coupleType = couplePairType.get(key)!;
    edges.push({
      id: `e-${key}-sa`,
      source: spouseA,
      target: uid,
      type: coupleType,
      data: { relationshipId: relId },
    });
    edges.push({
      id: `e-${key}-sb`,
      source: spouseB,
      target: uid,
      type: coupleType,
      data: { relationshipId: relId },
    });
  }

  // Direct parent → child edges not covered by a union node
  for (const r of parentRels) {
    if (!handledPairs.has(`${r.fromMemberId}::${r.toMemberId}`)) {
      edges.push({
        id: `e-parent-${r.id}`,
        source: r.fromMemberId,
        target: r.toMemberId,
        type: "parent" as const,
        data: { relationshipId: r.id },
      });
    }
  }

  // Direct spouse edges (childless couples — no union node created)
  for (const r of spouseRels) {
    const [a, b] = [r.fromMemberId, r.toMemberId].sort();
    if (!unionMap.has(`${a}::${b}`)) {
      const sourcePos = pos.get(r.fromMemberId);
      const targetPos = pos.get(r.toMemberId);
      const sourceIsOnLeft =
        sourcePos !== undefined &&
        targetPos !== undefined &&
        sourcePos.x <= targetPos.x;

      edges.push({
        id: `e-spouse-${r.id}`,
        source: r.fromMemberId,
        target: r.toMemberId,
        type: "spouse" as const,
        sourceHandle: sourceIsOnLeft
          ? SPOUSE_RIGHT_SOURCE_HANDLE
          : SPOUSE_LEFT_SOURCE_HANDLE,
        targetHandle: sourceIsOnLeft
          ? SPOUSE_LEFT_TARGET_HANDLE
          : SPOUSE_RIGHT_TARGET_HANDLE,
        data: { relationshipId: r.id },
      });
    }
  }

  // Direct divorced edges (childless couples — no union node created)
  for (const r of divorcedRels) {
    const [a, b] = [r.fromMemberId, r.toMemberId].sort();
    if (unionMap.has(`${a}::${b}`)) continue;
    const sourcePos = pos.get(r.fromMemberId);
    const targetPos = pos.get(r.toMemberId);
    const sourceIsOnLeft =
      sourcePos !== undefined &&
      targetPos !== undefined &&
      sourcePos.x <= targetPos.x;

    edges.push({
      id: `e-divorced-${r.id}`,
      source: r.fromMemberId,
      target: r.toMemberId,
      type: "divorced" as const,
      sourceHandle: sourceIsOnLeft
        ? SPOUSE_RIGHT_SOURCE_HANDLE
        : SPOUSE_LEFT_SOURCE_HANDLE,
      targetHandle: sourceIsOnLeft
        ? SPOUSE_LEFT_TARGET_HANDLE
        : SPOUSE_RIGHT_TARGET_HANDLE,
      data: { relationshipId: r.id },
    });
  }

  return { nodes: [...memberNodes, ...unionNodes], edges };
}

export function formatMemberDisplayName(member: TreeMemberData): string {
  const parts: string[] = [member.firstName];
  if (member.lastName) parts.push(member.lastName);
  const maiden = member.maidenName?.trim();
  const last = member.lastName?.trim();
  if (maiden && !(last && maiden.toLowerCase() === last.toLowerCase())) {
    parts.push(`(${maiden})`);
  }
  return parts.join(" ");
}

export function formatMemberDateRange(member: TreeMemberData): string {
  if (!member.birthYear && !member.deathYear) return "";
  if (member.isLiving && member.birthYear) return String(member.birthYear);
  const birth = member.birthYear ? String(member.birthYear) : "";
  if (!birth) return "";
  const death = member.deathYear ? String(member.deathYear) : "?";
  return `${birth} — ${death}`;
}
