import { describe, it, expect, vi } from "vitest";
import { createMember } from "./member-service";

describe("createMember", () => {
  it("allows owner and editor", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("owner"),
      getTreeMemberCount: vi.fn().mockResolvedValue(0),
      createMemberRecord: vi.fn().mockResolvedValue({ id: "m1" }),
    };

    const member = await createMember({
      repo,
      actorUserId: "u1",
      treeId: "t1",
      input: { firstName: "Elena", isLiving: false },
    });

    expect(member.id).toBe("m1");
  });

  it("rejects viewer", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("viewer"),
      getTreeMemberCount: vi.fn().mockResolvedValue(0),
      createMemberRecord: vi.fn(),
    };

    await expect(
      createMember({
        repo,
        actorUserId: "u2",
        treeId: "t1",
        input: { firstName: "Ivan", isLiving: false },
      }),
    ).rejects.toThrow("ERR_FORBIDDEN");
  });

  it("rejects when tree reached member limit", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("owner"),
      getTreeMemberCount: vi.fn().mockResolvedValue(300),
      createMemberRecord: vi.fn(),
    };

    await expect(
      createMember({
        repo,
        actorUserId: "u1",
        treeId: "t1",
        input: { firstName: "Elena", isLiving: false },
      }),
    ).rejects.toThrow("ERR_MEMBER_LIMIT_REACHED");
  });
});
