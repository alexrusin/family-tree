import { describe, it, expect, vi } from "vitest";
import { createMember } from "./member-service";

describe("createMember", () => {
  it("allows owner and editor", async () => {
    const repo = {
      getRole: vi.fn().mockResolvedValue("owner"),
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
});