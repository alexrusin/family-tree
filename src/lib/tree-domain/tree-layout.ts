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
  type: "parent" | "spouse" | "sibling";
}

export type MemberNodeData = { member: TreeMemberData };
export type UnionNodeData = { spouseIds: [string, string] };
export type TreeFlowNode =
  | Node<MemberNodeData, "member">
  | Node<UnionNodeData, "union">;
export type TreeFlowEdge =
  | Edge<{ relationshipId?: string; relationshipIds?: string[] }, "parent">
  | Edge<{ relationshipId: string }, "spouse">;

const NODE_W = 120;
const NODE_H = 150;
const UNION_SIZE = 8;

export function buildTreeGraph(
  members: TreeMemberData[],
  relationships: TreeRelationship[],
  arrangement?: TreeArrangement | null,
): { nodes: TreeFlowNode[]; edges: TreeFlowEdge[] } {
  if (members.length === 0) return { nodes: [], edges: [] };

  const parentRels = relationships.filter((r) => r.type === "parent");
  const spouseRels = relationships.filter((r) => r.type === "spouse");

  // ── Dagre layout (parent edges only drive the hierarchy) ──────────────
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    ranksep: 80,
    nodesep: 40,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const memberIds = new Set(members.map((m) => m.id));
  for (const m of members) g.setNode(m.id, { width: NODE_W, height: NODE_H });
  for (const r of parentRels) {
    if (memberIds.has(r.fromMemberId) && memberIds.has(r.toMemberId))
      g.setEdge(r.fromMemberId, r.toMemberId);
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

  // ── Parent → children map ─────────────────────────────────────────────
  const childrenOf = new Map<string, Set<string>>();
  const parentRelIdByPair = new Map<string, string>();
  for (const r of parentRels) {
    if (!childrenOf.has(r.fromMemberId))
      childrenOf.set(r.fromMemberId, new Set());
    childrenOf.get(r.fromMemberId)!.add(r.toMemberId);
    parentRelIdByPair.set(`${r.fromMemberId}::${r.toMemberId}`, r.id);
  }

  // ── Union nodes (spouse pairs with children) ──────────────────────────
  const unionNodes: TreeFlowNode[] = [];
  const unionMap = new Map<
    string,
    { spouseA: string; spouseB: string; children: Set<string> }
  >();
  const spousePairRelId = new Map<string, string>();

  for (const r of spouseRels) {
    const [a, b] = [r.fromMemberId, r.toMemberId].sort();
    const key = `${a}::${b}`;
    spousePairRelId.set(key, r.id);
    const kidsA = childrenOf.get(a) ?? new Set<string>();
    const kidsB = childrenOf.get(b) ?? new Set<string>();
    const kids = new Set([...kidsA].filter((k) => kidsB.has(k)));
    if (kids.size === 0) continue;
    const pa = pos.get(a);
    const pb = pos.get(b);
    if (!pa || !pb) continue;
    const ux = (pa.x + pb.x) / 2 + NODE_W / 2 - UNION_SIZE / 2;
    const uy = Math.max(pa.y, pb.y) + NODE_H - UNION_SIZE / 2;
    unionMap.set(key, { spouseA: a, spouseB: b, children: kids });
    unionNodes.push({
      id: `union-${key}`,
      type: "union" as const,
      position: { x: ux, y: uy },
      data: { spouseIds: [a, b] as [string, string] },
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
    const relId = spousePairRelId.get(key)!;
    edges.push({
      id: `e-${key}-sa`,
      source: spouseA,
      target: uid,
      type: "spouse" as const,
      data: { relationshipId: relId },
    });
    edges.push({
      id: `e-${key}-sb`,
      source: spouseB,
      target: uid,
      type: "spouse" as const,
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
      edges.push({
        id: `e-spouse-${r.id}`,
        source: r.fromMemberId,
        target: r.toMemberId,
        type: "spouse" as const,
        data: { relationshipId: r.id },
      });
    }
  }

  return { nodes: [...memberNodes, ...unionNodes], edges };
}

export function formatMemberDateRange(member: TreeMemberData): string {
  if (!member.birthYear && !member.deathYear) return "";
  if (member.isLiving && member.birthYear) return String(member.birthYear);
  const birth = member.birthYear ? String(member.birthYear) : "";
  if (!birth) return "";
  const death = member.deathYear ? String(member.deathYear) : "?";
  return `${birth} — ${death}`;
}
