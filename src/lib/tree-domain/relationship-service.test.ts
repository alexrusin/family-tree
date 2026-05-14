import { describe, it, expect, vi } from "vitest";
import { createRelationship } from "./relationship-service";

describe("createRelationship", () => {
  it("stores canonical parent for child input", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("editor"),
      hasRelationship: vi.fn().mockResolvedValue(false),
      createRelationshipRecord: vi
        .fn()
        .mockResolvedValue({ id: "r1", type: "parent" }),
    };

    const result = await createRelationship({
      repo,
      actorUserId: "u1",
      treeId: "t1",
      input: { fromMemberId: "B", toMemberId: "A", type: "child" },
    });

    expect(result.type).toBe("parent");
  });

  it("rejects duplicate inverse relationship", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("owner"),
      hasRelationship: vi.fn().mockResolvedValue(true),
      createRelationshipRecord: vi.fn(),
    };

    await expect(
      createRelationship({
        repo,
        actorUserId: "u1",
        treeId: "t1",
        input: { fromMemberId: "A", toMemberId: "B", type: "parent" },
      }),
    ).rejects.toThrow("ERR_DUPLICATE_RELATIONSHIP");
  });
});