import { describe, it, expect } from "vitest";
import { buildVisibleGraph } from "./visible-graph";
import { buildTreeGraph } from "./tree-layout";
import type {
  TreeArrangement,
  TreeMemberData,
  TreeRelationship,
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

describe("buildVisibleGraph", () => {
  it("equals existing builder when no members are hidden", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "parent" },
    ];
    const expected = buildTreeGraph(members, rels);
    const result = buildVisibleGraph(members, rels, new Set());
    expect(result.nodes.map((n) => n.id).sort()).toEqual(
      expected.nodes.map((n) => n.id).sort(),
    );
    expect(result.edges.map((e) => e.id).sort()).toEqual(
      expected.edges.map((e) => e.id).sort(),
    );
  });

  it("filters out hidden members and their edges", () => {
    const members = [makeMember("a"), makeMember("b"), makeMember("c")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "parent" },
      { id: "r2", fromMemberId: "a", toMemberId: "c", type: "parent" },
    ];
    const result = buildVisibleGraph(members, rels, new Set(["b"]));
    expect(result.nodes.find((n) => n.id === "b")).toBeUndefined();
    expect(result.edges.every((e) => e.source !== "b" && e.target !== "b")).toBe(
      true,
    );
    expect(result.nodes.some((n) => n.id === "a")).toBe(true);
    expect(result.nodes.some((n) => n.id === "c")).toBe(true);
  });

  it("drops boundary union node when a partner is hidden, surviving children get direct parent edge", () => {
    const members = [
      makeMember("dad"),
      makeMember("mom"),
      makeMember("child"),
    ];
    const rels: TreeRelationship[] = [
      { id: "rs", fromMemberId: "dad", toMemberId: "mom", type: "spouse" },
      { id: "rp1", fromMemberId: "dad", toMemberId: "child", type: "parent" },
      { id: "rp2", fromMemberId: "mom", toMemberId: "child", type: "parent" },
    ];

    const full = buildTreeGraph(members, rels);
    expect(full.nodes.some((n) => n.type === "union")).toBe(true);

    const result = buildVisibleGraph(members, rels, new Set(["mom"]));
    expect(result.nodes.every((n) => n.type !== "union")).toBe(true);
    const parentEdge = result.edges.find(
      (e) => e.type === "parent" && e.target === "child",
    );
    expect(parentEdge).toBeDefined();
    expect(parentEdge!.source).toBe("dad");
  });

  it("does not mutate the input arrangement", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "parent" },
    ];
    const arrangement: TreeArrangement = {
      a: { x: 100, y: 200 },
      b: { x: 300, y: 400 },
    };
    const copy = JSON.parse(JSON.stringify(arrangement));
    buildVisibleGraph(members, rels, new Set(["b"]), arrangement);
    expect(arrangement).toEqual(copy);
  });

  it("returns an empty hidden-count map when no anchors are collapsed", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "parent" },
    ];
    const result = buildVisibleGraph(members, rels, new Set(), null, []);
    expect(result.hiddenCounts.size).toBe(0);
  });

  it("returns the per-anchor hidden count for the Hidden Relatives Badge", async () => {
    const members = [
      makeMember("gp"),
      makeMember("parent"),
      makeMember("anchor"),
      makeMember("uncle"),
    ];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "gp", toMemberId: "parent", type: "parent" },
      { id: "r2", fromMemberId: "gp", toMemberId: "uncle", type: "parent" },
      {
        id: "r3",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
    ];
    const { computeHiddenSet } = await import("./collapse-branch");
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.size).toBe(3);

    const result = buildVisibleGraph(members, rels, hidden, null, ["anchor"]);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("anchor");
    // The count is now returned by buildVisibleGraph itself (computed against
    // the full data), not derived by the caller.
    expect(result.hiddenCounts.get("anchor")).toBe(3);
  });
});
