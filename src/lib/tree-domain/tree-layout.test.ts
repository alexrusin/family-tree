// src/lib/tree-domain/tree-layout.test.ts
import { describe, it, expect } from "vitest";
import {
  buildTreeGraph,
  formatMemberDateRange,
  formatMemberDisplayName,
  isValidArrangement,
  pruneArrangement,
  SPOUSE_LEFT_SOURCE_HANDLE,
  SPOUSE_LEFT_TARGET_HANDLE,
  SPOUSE_RIGHT_SOURCE_HANDLE,
  SPOUSE_RIGHT_TARGET_HANDLE,
  type TreeArrangement,
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
    maidenName: null,
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
    const { nodes, edges } = buildTreeGraph(members, rels, {
      a: { x: 0, y: 0 },
      b: { x: 300, y: 0 },
    });
    expect(nodes.filter((n) => n.type === "union")).toHaveLength(0);
    const e = edges.find((e) => e.type === "spouse");
    expect(e).toBeDefined();
    expect((e!.data as { relationshipId: string }).relationshipId).toBe("rs");
    expect(e?.sourceHandle).toBe(SPOUSE_RIGHT_SOURCE_HANDLE);
    expect(e?.targetHandle).toBe(SPOUSE_LEFT_TARGET_HANDLE);
  });

  it("creates a direct divorced edge (no union node) for a childless couple", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "rd", fromMemberId: "a", toMemberId: "b", type: "divorced" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels, {
      a: { x: 0, y: 0 },
      b: { x: 300, y: 0 },
    });
    expect(nodes.filter((n) => n.type === "union")).toHaveLength(0);
    const e = edges.find((e) => e.type === "divorced");
    expect(e).toBeDefined();
    expect((e!.data as { relationshipId: string }).relationshipId).toBe("rd");
    expect(e?.sourceHandle).toBe(SPOUSE_RIGHT_SOURCE_HANDLE);
    expect(e?.targetHandle).toBe(SPOUSE_LEFT_TARGET_HANDLE);
  });

  it("anchors a direct spouse edge to inward-facing side handles after manual arrangement changes", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
    ];

    const { edges } = buildTreeGraph(members, rels, {
      a: { x: 300, y: 0 },
      b: { x: 0, y: 0 },
    });

    const e = edges.find((edge) => edge.type === "spouse");
    expect(e).toBeDefined();
    expect(e?.sourceHandle).toBe(SPOUSE_LEFT_SOURCE_HANDLE);
    expect(e?.targetHandle).toBe(SPOUSE_RIGHT_TARGET_HANDLE);
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
    expect(
      edges
        .filter((e) => e.type === "spouse")
        .every((e) => !e.sourceHandle && !e.targetHandle),
    ).toBe(true);
    const parentEdges = edges.filter((e) => e.type === "parent");
    expect(parentEdges).toHaveLength(1);
    expect(parentEdges[0].target).toBe("child");
    expect(
      (parentEdges[0].data as { relationshipIds?: string[] }).relationshipIds,
    ).toEqual(["rpa", "rpb"]);
  });

  it("marks union nodes as non-selectable", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
      { id: "rpa", fromMemberId: "a", toMemberId: "child", type: "parent" },
      { id: "rpb", fromMemberId: "b", toMemberId: "child", type: "parent" },
    ];
    const { nodes } = buildTreeGraph(members, rels);
    const unionNodes = nodes.filter((n) => n.type === "union");
    expect(unionNodes).toHaveLength(1);
    expect(unionNodes[0].selectable).toBe(false);
  });

  it("creates a union node for a divorced couple with at least one shared child", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "rd", fromMemberId: "a", toMemberId: "b", type: "divorced" },
      { id: "rpa", fromMemberId: "a", toMemberId: "child", type: "parent" },
      { id: "rpb", fromMemberId: "b", toMemberId: "child", type: "parent" },
    ];
    const { nodes, edges } = buildTreeGraph(members, rels);
    const unionNodes = nodes.filter((n) => n.type === "union");
    expect(unionNodes).toHaveLength(1);
    expect(edges.filter((e) => e.type === "divorced")).toHaveLength(2);
    expect(
      edges
        .filter((e) => e.type === "divorced")
        .every((e) => !e.sourceHandle && !e.targetHandle),
    ).toBe(true);
    const parentEdges = edges.filter((e) => e.type === "parent");
    expect(parentEdges).toHaveLength(1);
    expect(parentEdges[0].target).toBe("child");
    expect(
      (parentEdges[0].data as { relationshipIds?: string[] }).relationshipIds,
    ).toEqual(["rpa", "rpb"]);
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

describe("isValidArrangement", () => {
  it("accepts a valid arrangement with finite coordinates", () => {
    expect(isValidArrangement({ m1: { x: 10, y: 20 }, m2: { x: -5, y: 0 } })).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidArrangement(null)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(isValidArrangement([{ x: 1, y: 2 }])).toBe(false);
  });

  it("rejects entries with non-finite coordinates", () => {
    expect(isValidArrangement({ m1: { x: NaN, y: 20 } })).toBe(false);
    expect(isValidArrangement({ m1: { x: 10, y: Infinity } })).toBe(false);
  });

  it("rejects entries with missing coordinates", () => {
    expect(isValidArrangement({ m1: { x: 10 } })).toBe(false);
    expect(isValidArrangement({ m1: "string" })).toBe(false);
  });

  it("accepts an empty object (no overrides)", () => {
    expect(isValidArrangement({})).toBe(true);
  });
});

describe("buildTreeGraph with arrangement", () => {
  it("uses auto-layout positions when arrangement is null", () => {
    const members = [makeMember("parent"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "parent", toMemberId: "child", type: "parent" },
    ];
    const { nodes: autoNodes } = buildTreeGraph(members, rels);
    const { nodes: nullNodes } = buildTreeGraph(members, rels, null);
    const auto = autoNodes.find((n) => n.id === "parent")!;
    const nulled = nullNodes.find((n) => n.id === "parent")!;
    expect(nulled.position).toEqual(auto.position);
  });

  it("overrides member positions from arrangement", () => {
    const members = [makeMember("a"), makeMember("b")];
    const arrangement: TreeArrangement = {
      a: { x: 100, y: 200 },
      b: { x: 300, y: 400 },
    };
    const { nodes } = buildTreeGraph(members, [], arrangement);
    const nodeA = nodes.find((n) => n.id === "a")!;
    const nodeB = nodes.find((n) => n.id === "b")!;
    expect(nodeA.position).toEqual({ x: 100, y: 200 });
    expect(nodeB.position).toEqual({ x: 300, y: 400 });
  });

  it("uses auto-layout for members not present in a partial arrangement", () => {
    const members = [makeMember("a"), makeMember("b")];
    const arrangement: TreeArrangement = { a: { x: 50, y: 60 } };
    const { nodes: autoNodes } = buildTreeGraph(members, []);
    const { nodes } = buildTreeGraph(members, [], arrangement);
    const nodeA = nodes.find((n) => n.id === "a")!;
    const nodeB = nodes.find((n) => n.id === "b")!;
    const autoB = autoNodes.find((n) => n.id === "b")!;
    expect(nodeA.position).toEqual({ x: 50, y: 60 });
    expect(nodeB.position).toEqual(autoB.position);
  });

  it("ignores arrangement entries for member IDs not in the tree", () => {
    const members = [makeMember("a")];
    const arrangement: TreeArrangement = {
      a: { x: 10, y: 20 },
      stale: { x: 999, y: 999 },
    };
    const { nodes } = buildTreeGraph(members, [], arrangement);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].position).toEqual({ x: 10, y: 20 });
  });

  it("recomputes union node position from overridden member positions", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
      { id: "rpa", fromMemberId: "a", toMemberId: "child", type: "parent" },
      { id: "rpb", fromMemberId: "b", toMemberId: "child", type: "parent" },
    ];
    const arrangement: TreeArrangement = {
      a: { x: 0, y: 0 },
      b: { x: 200, y: 0 },
      child: { x: 100, y: 300 },
    };
    const { nodes } = buildTreeGraph(members, rels, arrangement);
    const unionNode = nodes.find((n) => n.type === "union")!;
    // Union node must exist and its position must be derived from the saved
    // member positions, not the auto-layout positions.
    expect(unionNode).toBeDefined();
    // Centered horizontally between a (x=0) and b (x=200): mid x ≈ 0+200/2 = 100
    // The exact formula is (pa.x + pb.x) / 2 + NODE_W / 2 - UNION_SIZE / 2 where NODE_W=120, UNION_SIZE=8
    expect(unionNode.position.x).toBeCloseTo(100 + 120 / 2 - 8 / 2, 0);
  });
});

describe("pruneArrangement", () => {
  it("removes the deleted member's entry while keeping all others", () => {
    const arrangement: TreeArrangement = {
      m1: { x: 10, y: 20 },
      m2: { x: 30, y: 40 },
      m3: { x: 50, y: 60 },
    };
    const result = pruneArrangement(arrangement, new Set(["m1", "m3"]));
    expect(result).toEqual({
      m1: { x: 10, y: 20 },
      m3: { x: 50, y: 60 },
    });
    expect("m2" in result).toBe(false);
  });

  it("returns empty object when all entries are pruned", () => {
    const arrangement: TreeArrangement = { m1: { x: 10, y: 20 } };
    expect(pruneArrangement(arrangement, new Set([]))).toEqual({});
  });

  it("returns arrangement unchanged when every member is in the remaining set", () => {
    const arrangement: TreeArrangement = { m1: { x: 10, y: 20 } };
    expect(pruneArrangement(arrangement, new Set(["m1"]))).toEqual(arrangement);
  });

  it("returns empty object for an empty arrangement regardless of remaining set", () => {
    expect(pruneArrangement({}, new Set(["m1"]))).toEqual({});
  });
});

describe("arrangement preservation during tree edits", () => {
  it("keeps existing saved positions fixed and seeds newly added member with a valid position", () => {
    const parent = makeMember("parent");
    const child = makeMember("child");
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "parent", toMemberId: "child", type: "parent" },
    ];
    // Parent has a saved position; child is newly added (not in arrangement).
    const arrangement: TreeArrangement = { parent: { x: 500, y: 100 } };
    const { nodes } = buildTreeGraph([parent, child], rels, arrangement);

    const parentNode = nodes.find((n) => n.id === "parent")!;
    const childNode = nodes.find((n) => n.id === "child")!;

    // Parent's manually saved position must not change.
    expect(parentNode.position).toEqual({ x: 500, y: 100 });
    // Newly added child receives a valid (finite) seeded position from auto-layout.
    expect(Number.isFinite(childNode.position.x)).toBe(true);
    expect(Number.isFinite(childNode.position.y)).toBe(true);
  });

  it("keeps all positioned members fixed when a relationship is added between existing members", () => {
    const a = makeMember("a");
    const b = makeMember("b");
    const arrangement: TreeArrangement = {
      a: { x: 100, y: 200 },
      b: { x: 300, y: 200 },
    };
    // No relationship initially — both members are positioned.
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "a", toMemberId: "b", type: "spouse" },
    ];
    const { nodes } = buildTreeGraph([a, b], rels, arrangement);

    const nodeA = nodes.find((n) => n.id === "a")!;
    const nodeB = nodes.find((n) => n.id === "b")!;
    expect(nodeA.position).toEqual({ x: 100, y: 200 });
    expect(nodeB.position).toEqual({ x: 300, y: 200 });
  });

  it("keeps positioned members fixed when a relationship is deleted (arrangement unchanged)", () => {
    const a = makeMember("a");
    const b = makeMember("b");
    const arrangement: TreeArrangement = {
      a: { x: 100, y: 200 },
      b: { x: 300, y: 200 },
    };
    // After relationship deletion the caller rebuilds with fewer rels — positions stay.
    const { nodes } = buildTreeGraph([a, b], [], arrangement);

    const nodeA = nodes.find((n) => n.id === "a")!;
    const nodeB = nodes.find((n) => n.id === "b")!;
    expect(nodeA.position).toEqual({ x: 100, y: 200 });
    expect(nodeB.position).toEqual({ x: 300, y: 200 });
  });
});

describe("formatMemberDateRange", () => {
  it("returns empty string when no dates are set", () => {
    expect(formatMemberDateRange(makeMember("x"))).toBe("");
  });

  it("returns only birth year for a living member", () => {
    const m = makeMember("x", { isLiving: true, birthYear: 1990 });
    expect(formatMemberDateRange(m)).toBe("1990");
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

describe("formatMemberDisplayName", () => {
  it("renders First Last (Maiden) when both names present", () => {
    const m = makeMember("x", { firstName: "Elena", lastName: "Ivanova", maidenName: "Petrova" });
    expect(formatMemberDisplayName(m)).toBe("Elena Ivanova (Petrova)");
  });

  it("renders First (Maiden) when no last name", () => {
    const m = makeMember("x", { firstName: "Elena", maidenName: "Petrova" });
    expect(formatMemberDisplayName(m)).toBe("Elena (Petrova)");
  });

  it("suppresses parenthetical when maiden equals last name (case-insensitive)", () => {
    const m = makeMember("x", { firstName: "Elena", lastName: "Ivanova", maidenName: "ivanova" });
    expect(formatMemberDisplayName(m)).toBe("Elena Ivanova");
  });

  it("suppresses parenthetical when maiden equals last name with surrounding whitespace", () => {
    const m = makeMember("x", { firstName: "Elena", lastName: "Ivanova", maidenName: "  Ivanova  " });
    expect(formatMemberDisplayName(m)).toBe("Elena Ivanova");
  });

  it("renders First Last when no maiden name", () => {
    const m = makeMember("x", { firstName: "Elena", lastName: "Ivanova" });
    expect(formatMemberDisplayName(m)).toBe("Elena Ivanova");
  });

  it("renders first name only when neither last nor maiden name", () => {
    const m = makeMember("x", { firstName: "Elena" });
    expect(formatMemberDisplayName(m)).toBe("Elena");
  });
});
