// src/lib/tree-domain/tree-layout.test.ts
import { describe, it, expect } from "vitest";
import {
  buildTreeGraph,
  formatMemberDateRange,
  type TreeMemberData,
  type TreeRelationship,
} from "./tree-layout";

function makeMember(
  id: string,
  overrides: Partial<TreeMemberData> = {},
): TreeMemberData {
  return {
    id,
    firstName: "Test",
    lastName: null,
    isLiving: false,
    birthYear: null,
    birthMonth: null,
    birthDay: null,
    birthPrecision: null,
    deathYear: null,
    deathMonth: null,
    deathDay: null,
    deathPrecision: null,
    photoUrl: null,
    bio: null,
    gender: "undisclosed",
    ...overrides,
  };
}

describe("buildTreeGraph", () => {
  it("returns empty nodes and edges when members array is empty", () => {
    const { nodes, edges } = buildTreeGraph([], []);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("returns one member node with correct id and type for a single member", () => {
    const { nodes, edges } = buildTreeGraph([makeMember("m1")], []);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("m1");
    expect(nodes[0].type).toBe("member");
    expect(edges).toHaveLength(0);
  });

  it("creates a direct parent edge with relationshipId for a parent-child pair", () => {
    const members = [makeMember("parent"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "parent", toMemberId: "child", type: "parent" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels);
    expect(nodes).toHaveLength(2);
    const e = edges.find((e) => e.source === "parent" && e.target === "child");
    expect(e).toBeDefined();
    expect(e!.type).toBe("parent");
    expect((e!.data as { relationshipId?: string }).relationshipId).toBe("r1");
  });

  it("places the parent node above the child node (lower y-coordinate)", () => {
    const members = [makeMember("parent"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "parent", toMemberId: "child", type: "parent" },
    ];
    const { nodes } = buildTreeGraph(members, rels);
    const parentNode = nodes.find((n) => n.id === "parent")!;
    const childNode = nodes.find((n) => n.id === "child")!;
    expect(parentNode.position.y).toBeLessThan(childNode.position.y);
  });

  it("ignores sibling relationships — no edge produced", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "sibling" },
    ];
    const { edges } = buildTreeGraph(members, rels);
    expect(edges).toHaveLength(0);
  });

  it("creates a direct spouse edge (no union node) for a childless couple", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels);
    expect(nodes.filter((n) => n.type === "union")).toHaveLength(0);
    const e = edges.find((e) => e.type === "spouse");
    expect(e).toBeDefined();
    expect((e!.data as { relationshipId: string }).relationshipId).toBe("rs");
  });

  it("creates a union node for a couple with at least one child of either parent", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
      { id: "rpa", fromMemberId: "a", toMemberId: "child", type: "parent" },
      { id: "rpb", fromMemberId: "b", toMemberId: "child", type: "parent" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels);
    const unionNodes = nodes.filter((n) => n.type === "union");
    expect(unionNodes).toHaveLength(1);
    expect(edges.filter((e) => e.type === "spouse")).toHaveLength(2);
    const parentEdges = edges.filter((e) => e.type === "parent");
    expect(parentEdges).toHaveLength(1);
    expect(parentEdges[0].target).toBe("child");
  });

  it("does NOT create a union node when spouses share no children", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("c")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
      { id: "rpa", fromMemberId: "a", toMemberId: "c", type: "parent" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels);
    expect(nodes.filter((n) => n.type === "union")).toHaveLength(0);
    expect(edges.filter((e) => e.type === "spouse")).toHaveLength(1);
    const pe = edges.find((e) => e.source === "a" && e.target === "c");
    expect(pe).toBeDefined();
  });
});

describe("formatMemberDateRange", () => {
  it("returns empty string when no dates are set", () => {
    expect(formatMemberDateRange(makeMember("x"))).toBe("");
  });

  it("returns only birth year for a living member", () => {
    const m = makeMember("x", { isLiving: true, birthYear: 1990 });
    expect(formatMemberDateRange(m)).toBe("b. 1990");
  });

  it("returns birth–death range for a deceased member", () => {
    const m = makeMember("x", { birthYear: 1920, deathYear: 2000 });
    expect(formatMemberDateRange(m)).toBe("1920 — 2000");
  });

  it("returns birth year with unknown death when no death year", () => {
    const m = makeMember("x", { birthYear: 1950 });
    expect(formatMemberDateRange(m)).toBe("1950 — ?");
  });
});
