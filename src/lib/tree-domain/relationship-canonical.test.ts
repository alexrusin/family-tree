import { describe, it, expect } from "vitest";
import {
  canonicalizeRelationship,
  relationshipDedupKey,
} from "./relationship-canonical";

describe("canonicalizeRelationship", () => {
  it("normalizes child relation into parent canonical type", () => {
    const canonical = canonicalizeRelationship({
      fromMemberId: "B",
      toMemberId: "A",
      type: "child",
    });

    expect(canonical).toEqual({
      fromMemberId: "A",
      toMemberId: "B",
      type: "parent",
    });
  });

  it("throws on self relationship", () => {
    expect(() =>
      canonicalizeRelationship({
        fromMemberId: "A",
        toMemberId: "A",
        type: "spouse",
      }),
    ).toThrow("ERR_SELF_RELATIONSHIP");
  });
});

describe("relationshipDedupKey", () => {
  it("creates stable key for spouse regardless of direction", () => {
    const k1 = relationshipDedupKey({
      fromMemberId: "A",
      toMemberId: "B",
      type: "spouse",
    });
    const k2 = relationshipDedupKey({
      fromMemberId: "B",
      toMemberId: "A",
      type: "spouse",
    });
    expect(k1).toBe(k2);
  });
});
