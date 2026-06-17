import { describe, it, expect } from "vitest";
import {
  computeHiddenSet,
  computeMultiAnchorHiddenSet,
  computePerAnchorHiddenCounts,
} from "./collapse-branch";
import type { TreeMemberData, TreeRelationship } from "./tree-layout";

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

describe("computeHiddenSet", () => {
  it("returns empty set for a root (no ancestors)", () => {
    const members = [makeMember("root"), makeMember("child")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "root", toMemberId: "child", type: "parent" },
    ];
    expect(computeHiddenSet("root", members, rels).size).toBe(0);
  });

  it("hides the ancestor chain above the anchor", () => {
    const members = [
      makeMember("grandparent"),
      makeMember("parent"),
      makeMember("anchor"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "grandparent",
        toMemberId: "parent",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
    ];
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.has("grandparent")).toBe(true);
    expect(hidden.has("parent")).toBe(true);
    expect(hidden.has("anchor")).toBe(false);
  });

  it("keeps the anchor's own descendants visible", () => {
    const members = [
      makeMember("parent"),
      makeMember("anchor"),
      makeMember("child"),
      makeMember("grandchild"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "anchor",
        toMemberId: "child",
        type: "parent",
      },
      {
        id: "r3",
        fromMemberId: "child",
        toMemberId: "grandchild",
        type: "parent",
      },
    ];
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.has("parent")).toBe(true);
    expect(hidden.has("anchor")).toBe(false);
    expect(hidden.has("child")).toBe(false);
    expect(hidden.has("grandchild")).toBe(false);
  });

  it("hides collateral relatives (aunts, uncles, cousins)", () => {
    const members = [
      makeMember("grandparent"),
      makeMember("parent"),
      makeMember("uncle"),
      makeMember("cousin"),
      makeMember("anchor"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "grandparent",
        toMemberId: "parent",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "grandparent",
        toMemberId: "uncle",
        type: "parent",
      },
      {
        id: "r3",
        fromMemberId: "uncle",
        toMemberId: "cousin",
        type: "parent",
      },
      {
        id: "r4",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
    ];
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.has("grandparent")).toBe(true);
    expect(hidden.has("parent")).toBe(true);
    expect(hidden.has("uncle")).toBe(true);
    expect(hidden.has("cousin")).toBe(true);
    expect(hidden.has("anchor")).toBe(false);
  });

  it("keeps the anchor's spouse visible", () => {
    const members = [
      makeMember("parent"),
      makeMember("anchor"),
      makeMember("spouse"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "anchor",
        toMemberId: "spouse",
        type: "spouse",
      },
    ];
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.has("spouse")).toBe(false);
    expect(hidden.has("parent")).toBe(true);
  });

  it("keeps the anchor's divorced partner visible", () => {
    const members = [
      makeMember("parent"),
      makeMember("anchor"),
      makeMember("ex"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "anchor",
        toMemberId: "ex",
        type: "divorced",
      },
    ];
    const hidden = computeHiddenSet("anchor", members, rels);
    expect(hidden.has("ex")).toBe(false);
  });

  it("terminates on cycles", () => {
    const members = [makeMember("a"), makeMember("b")];
    const rels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "a", toMemberId: "b", type: "parent" },
      { id: "r2", fromMemberId: "b", toMemberId: "a", type: "parent" },
    ];
    expect(() => computeHiddenSet("a", members, rels)).not.toThrow();
    expect(() => computeHiddenSet("b", members, rels)).not.toThrow();
  });

  it("returns empty set for an anchor not present in members", () => {
    const members = [makeMember("a")];
    expect(computeHiddenSet("nonexistent", members, []).size).toBe(0);
  });
});

describe("computeMultiAnchorHiddenSet", () => {
  const members = [
    makeMember("gp"),
    makeMember("p1"),
    makeMember("p2"),
    makeMember("a1"),
    makeMember("a2"),
    makeMember("uncle"),
  ];
  const rels: TreeRelationship[] = [
    { id: "r1", fromMemberId: "gp", toMemberId: "p1", type: "parent" },
    { id: "r2", fromMemberId: "gp", toMemberId: "p2", type: "parent" },
    { id: "r3", fromMemberId: "p1", toMemberId: "a1", type: "parent" },
    { id: "r4", fromMemberId: "p2", toMemberId: "a2", type: "parent" },
    { id: "r5", fromMemberId: "p2", toMemberId: "uncle", type: "parent" },
  ];

  it("returns order-independent union of per-anchor hidden sets", () => {
    const resultAB = computeMultiAnchorHiddenSet(["a1", "a2"], members, rels);
    const resultBA = computeMultiAnchorHiddenSet(["a2", "a1"], members, rels);
    expect(resultAB).toEqual(resultBA);
  });

  it("skips stale anchors not present in members", () => {
    const result = computeMultiAnchorHiddenSet(
      ["a1", "stale-id"],
      members,
      rels,
    );
    const expected = computeHiddenSet("a1", members, rels);
    expect(result).toEqual(expected);
  });
});

describe("computePerAnchorHiddenCounts", () => {
  it("returns correct count per anchor", () => {
    const members = [
      makeMember("grandparent"),
      makeMember("parent"),
      makeMember("anchor"),
      makeMember("uncle"),
    ];
    const rels: TreeRelationship[] = [
      {
        id: "r1",
        fromMemberId: "grandparent",
        toMemberId: "parent",
        type: "parent",
      },
      {
        id: "r2",
        fromMemberId: "grandparent",
        toMemberId: "uncle",
        type: "parent",
      },
      {
        id: "r3",
        fromMemberId: "parent",
        toMemberId: "anchor",
        type: "parent",
      },
    ];
    const counts = computePerAnchorHiddenCounts(["anchor"], members, rels);
    expect(counts.get("anchor")).toBe(3);
  });

  it("skips stale anchors", () => {
    const members = [makeMember("a")];
    const counts = computePerAnchorHiddenCounts(["a", "gone"], members, []);
    expect(counts.has("gone")).toBe(false);
  });
});
