import { describe, it, expect, vi } from "vitest";
import { createRelationship } from "./relationship-service";

describe("createRelationship", () => {
  it("stores canonical parent for child input", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("editor"),
      hasRelationship: vi.fn().mockResolvedValue(false),
      findRelationship: vi.fn().mockResolvedValue(null),
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
      findRelationship: vi.fn().mockResolvedValue(null),
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

  it("rejects same-type duplicate for divorced", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("owner"),
      hasRelationship: vi.fn().mockResolvedValue(true),
      findRelationship: vi.fn().mockResolvedValue(null),
      createRelationshipRecord: vi.fn(),
    };

    await expect(
      createRelationship({
        repo,
        actorUserId: "u1",
        treeId: "t1",
        input: { fromMemberId: "A", toMemberId: "B", type: "divorced" },
      }),
    ).rejects.toThrow("ERR_DUPLICATE_RELATIONSHIP");
  });

  it("creating a divorced relationship deletes an existing spouse relationship for the pair", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("editor"),
      hasRelationship: vi.fn().mockResolvedValue(false),
      findRelationship: vi.fn().mockResolvedValue({ id: "spouse-1" }),
      createRelationshipRecord: vi
        .fn()
        .mockResolvedValue({ id: "r2", type: "divorced" }),
    };

    const result = await createRelationship({
      repo,
      actorUserId: "u1",
      treeId: "t1",
      input: { fromMemberId: "A", toMemberId: "B", type: "divorced" },
    });

    expect(repo.findRelationship).toHaveBeenCalledWith({
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "spouse",
    });
    expect(repo.createRelationshipRecord).toHaveBeenCalledWith({
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "divorced",
      deleteOppositeId: "spouse-1",
    });
    expect(result.type).toBe("divorced");
  });

  it("creating a spouse relationship deletes an existing divorced relationship for the pair, direction-independent", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("editor"),
      hasRelationship: vi.fn().mockResolvedValue(false),
      findRelationship: vi.fn().mockResolvedValue({ id: "divorced-1" }),
      createRelationshipRecord: vi
        .fn()
        .mockResolvedValue({ id: "r3", type: "spouse" }),
    };

    const result = await createRelationship({
      repo,
      actorUserId: "u1",
      treeId: "t1",
      input: { fromMemberId: "B", toMemberId: "A", type: "spouse" },
    });

    expect(repo.findRelationship).toHaveBeenCalledWith({
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "divorced",
    });
    expect(repo.createRelationshipRecord).toHaveBeenCalledWith({
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "spouse",
      deleteOppositeId: "divorced-1",
    });
    expect(result.type).toBe("spouse");
  });

  it("does not delete anything when no opposite-status relationship exists", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("editor"),
      hasRelationship: vi.fn().mockResolvedValue(false),
      findRelationship: vi.fn().mockResolvedValue(null),
      createRelationshipRecord: vi
        .fn()
        .mockResolvedValue({ id: "r4", type: "spouse" }),
    };

    await createRelationship({
      repo,
      actorUserId: "u1",
      treeId: "t1",
      input: { fromMemberId: "A", toMemberId: "B", type: "spouse" },
    });

    expect(repo.createRelationshipRecord).toHaveBeenCalledWith({
      treeId: "t1",
      fromMemberId: "A",
      toMemberId: "B",
      type: "spouse",
      deleteOppositeId: undefined,
    });
  });
});
