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

  describe("reachability rescue", () => {
    // Wife's-sister-married-my-brother scenario:
    //   you-dad → you, you-dad → brother
    //   wife-dad → wife (anchor), wife-dad → sister
    //   you ↔ wife (spouse), brother ↔ sister (spouse)
    //   you → kid (parent), wife → kid (parent)
    //   brother → nephew (parent), sister → nephew (parent)
    const rescueMembers = [
      makeMember("you"),
      makeMember("you-dad"),
      makeMember("brother"),
      makeMember("wife"),
      makeMember("wife-dad"),
      makeMember("sister"),
      makeMember("kid"),
      makeMember("nephew"),
    ];
    const rescueRels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "you-dad", toMemberId: "you", type: "parent" },
      {
        id: "r2",
        fromMemberId: "you-dad",
        toMemberId: "brother",
        type: "parent",
      },
      {
        id: "r3",
        fromMemberId: "wife-dad",
        toMemberId: "wife",
        type: "parent",
      },
      {
        id: "r4",
        fromMemberId: "wife-dad",
        toMemberId: "sister",
        type: "parent",
      },
      { id: "r5", fromMemberId: "you", toMemberId: "wife", type: "spouse" },
      {
        id: "r6",
        fromMemberId: "brother",
        toMemberId: "sister",
        type: "spouse",
      },
      { id: "r7", fromMemberId: "you", toMemberId: "kid", type: "parent" },
      { id: "r8", fromMemberId: "wife", toMemberId: "kid", type: "parent" },
      {
        id: "r9",
        fromMemberId: "brother",
        toMemberId: "nephew",
        type: "parent",
      },
      {
        id: "r10",
        fromMemberId: "sister",
        toMemberId: "nephew",
        type: "parent",
      },
    ];

    it("keeps cross-linked relatives visible (wife's sister married my brother)", () => {
      const hidden = computeHiddenSet("wife", rescueMembers, rescueRels);
      expect(hidden.has("sister")).toBe(false);
      expect(hidden.has("nephew")).toBe(false);
      expect(hidden.has("wife")).toBe(false);
      expect(hidden.has("kid")).toBe(false);
      expect(hidden.has("you")).toBe(false);
      expect(hidden.has("brother")).toBe(false);
    });

    it("hides the same relative when the cross-link does not exist (contrast)", () => {
      const relsWithoutCrossLink = rescueRels.filter(
        (r) => r.id !== "r6" && r.id !== "r9",
      );
      const hidden = computeHiddenSet("wife", rescueMembers, relsWithoutCrossLink);
      expect(hidden.has("sister")).toBe(true);
      expect(hidden.has("nephew")).toBe(true);
      expect(hidden.has("wife-dad")).toBe(true);
    });

    it("keeps an ancestor hidden when reachable from kept set only via the anchor", () => {
      const hidden = computeHiddenSet("wife", rescueMembers, rescueRels);
      expect(hidden.has("wife-dad")).toBe(true);
    });
  });

  describe("married-in in-laws", () => {
    it("hides a hidden relative's childless married-in spouse", () => {
      // wife-dad → wife (anchor), wife-dad → sister
      // sister ↔ brother-in-law (spouse, married in, no children, no other links)
      // you ↔ wife (spouse)
      const members = [
        makeMember("you"),
        makeMember("wife"),
        makeMember("wife-dad"),
        makeMember("sister"),
        makeMember("brother-in-law"),
        makeMember("kid"),
      ];
      const rels: TreeRelationship[] = [
        { id: "r1", fromMemberId: "wife-dad", toMemberId: "wife", type: "parent" },
        { id: "r2", fromMemberId: "wife-dad", toMemberId: "sister", type: "parent" },
        { id: "r3", fromMemberId: "you", toMemberId: "wife", type: "spouse" },
        { id: "r4", fromMemberId: "sister", toMemberId: "brother-in-law", type: "spouse" },
        { id: "r5", fromMemberId: "you", toMemberId: "kid", type: "parent" },
        { id: "r6", fromMemberId: "wife", toMemberId: "kid", type: "parent" },
      ];
      const hidden = computeHiddenSet("wife", members, rels);
      expect(hidden.has("wife-dad")).toBe(true);
      expect(hidden.has("sister")).toBe(true);
      expect(hidden.has("brother-in-law")).toBe(true);
      expect(hidden.has("wife")).toBe(false);
      expect(hidden.has("you")).toBe(false);
      expect(hidden.has("kid")).toBe(false);
    });

    it("rescues a married-in partner who has an independent connection to the kept set", () => {
      // wife-dad → wife (anchor), wife-dad → sister
      // sister ↔ brother-in-law (spouse)
      // brother-in-law is also you-dad's child (independent link)
      // you-dad → you, you-dad → brother-in-law
      // you ↔ wife (spouse)
      const members = [
        makeMember("you"),
        makeMember("you-dad"),
        makeMember("wife"),
        makeMember("wife-dad"),
        makeMember("sister"),
        makeMember("brother-in-law"),
        makeMember("kid"),
      ];
      const rels: TreeRelationship[] = [
        { id: "r1", fromMemberId: "wife-dad", toMemberId: "wife", type: "parent" },
        { id: "r2", fromMemberId: "wife-dad", toMemberId: "sister", type: "parent" },
        { id: "r3", fromMemberId: "you", toMemberId: "wife", type: "spouse" },
        { id: "r4", fromMemberId: "sister", toMemberId: "brother-in-law", type: "spouse" },
        { id: "r5", fromMemberId: "you-dad", toMemberId: "you", type: "parent" },
        { id: "r6", fromMemberId: "you-dad", toMemberId: "brother-in-law", type: "parent" },
        { id: "r7", fromMemberId: "you", toMemberId: "kid", type: "parent" },
        { id: "r8", fromMemberId: "wife", toMemberId: "kid", type: "parent" },
      ];
      const hidden = computeHiddenSet("wife", members, rels);
      expect(hidden.has("brother-in-law")).toBe(false);
      expect(hidden.has("sister")).toBe(false);
      expect(hidden.has("wife-dad")).toBe(true);
    });

    it("never hides the anchor's own spouse", () => {
      const members = [
        makeMember("parent"),
        makeMember("anchor"),
        makeMember("spouse"),
      ];
      const rels: TreeRelationship[] = [
        { id: "r1", fromMemberId: "parent", toMemberId: "anchor", type: "parent" },
        { id: "r2", fromMemberId: "anchor", toMemberId: "spouse", type: "spouse" },
      ];
      const hidden = computeHiddenSet("anchor", members, rels);
      expect(hidden.has("spouse")).toBe(false);
      expect(hidden.has("parent")).toBe(true);
    });
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

  describe("nested collapsed anchors", () => {
    // Inner anchor sits inside the outer anchor's collapsed branch:
    //   g-grandpa → grandpa → dad → you → kid (a single ancestral line)
    //   Collapse "you" (outer)  → hides {dad, grandpa, g-grandpa}
    //   Collapse "dad" (inner)  → hides {grandpa, g-grandpa}
    const nestedMembers = [
      makeMember("g-grandpa"),
      makeMember("grandpa"),
      makeMember("dad"),
      makeMember("you"),
      makeMember("kid"),
    ];
    const nestedRels: TreeRelationship[] = [
      { id: "r1", fromMemberId: "g-grandpa", toMemberId: "grandpa", type: "parent" },
      { id: "r2", fromMemberId: "grandpa", toMemberId: "dad", type: "parent" },
      { id: "r3", fromMemberId: "dad", toMemberId: "you", type: "parent" },
      { id: "r4", fromMemberId: "you", toMemberId: "kid", type: "parent" },
    ];

    it("union of an outer anchor and a nested inner anchor equals the outer alone", () => {
      const union = computeMultiAnchorHiddenSet(
        ["you", "dad"],
        nestedMembers,
        nestedRels,
      );
      const outerOnly = computeHiddenSet("you", nestedMembers, nestedRels);
      // "dad" is already inside "you"'s hidden set, so the union adds nothing.
      expect(union).toEqual(outerOnly);
      expect(union.has("dad")).toBe(true);
      expect(union.has("grandpa")).toBe(true);
      expect(union.has("g-grandpa")).toBe(true);
      expect(union.has("you")).toBe(false);
      expect(union.has("kid")).toBe(false);
    });

    it("is order-independent for nested anchors", () => {
      const outerFirst = computeMultiAnchorHiddenSet(
        ["you", "dad"],
        nestedMembers,
        nestedRels,
      );
      const innerFirst = computeMultiAnchorHiddenSet(
        ["dad", "you"],
        nestedMembers,
        nestedRels,
      );
      expect(outerFirst).toEqual(innerFirst);
    });

    it("expanding the outer anchor leaves the inner branch still collapsed", () => {
      // Removing "you" from the collapsed set (expanding it) must still apply
      // "dad"'s collapse: dad and you become visible, but dad's ancestors stay hidden.
      const innerOnly = computeMultiAnchorHiddenSet(
        ["dad"],
        nestedMembers,
        nestedRels,
      );
      expect(innerOnly.has("dad")).toBe(false);
      expect(innerOnly.has("you")).toBe(false);
      expect(innerOnly.has("grandpa")).toBe(true);
      expect(innerOnly.has("g-grandpa")).toBe(true);
    });
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
