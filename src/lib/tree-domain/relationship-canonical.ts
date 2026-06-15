export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "divorced"
  | "sibling";

export interface RelationshipInput {
  fromMemberId: string;
  toMemberId: string;
  type: RelationshipType;
}

export interface CanonicalRelationship {
  fromMemberId: string;
  toMemberId: string;
  type: "parent" | "spouse" | "divorced" | "sibling";
}

export function canonicalizeRelationship(
  input: RelationshipInput,
): CanonicalRelationship {
  if (input.fromMemberId === input.toMemberId) {
    throw new Error("ERR_SELF_RELATIONSHIP");
  }

  if (input.type === "child") {
    return {
      fromMemberId: input.toMemberId,
      toMemberId: input.fromMemberId,
      type: "parent",
    };
  }

  if (
    input.type === "spouse" ||
    input.type === "divorced" ||
    input.type === "sibling"
  ) {
    const [a, b] = [input.fromMemberId, input.toMemberId].sort();
    return { fromMemberId: a, toMemberId: b, type: input.type };
  }

  return {
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    type: "parent",
  };
}

export function relationshipDedupKey(input: RelationshipInput): string {
  const canonical = canonicalizeRelationship(input);
  return `${canonical.type}:${canonical.fromMemberId}:${canonical.toMemberId}`;
}
