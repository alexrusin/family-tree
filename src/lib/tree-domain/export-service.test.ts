import { describe, expect, it, vi } from "vitest";
import { buildGedcomFilename, exportTreeAsGedcom } from "./export-service";

describe("buildGedcomFilename", () => {
  it("slugifies the tree name", () => {
    expect(buildGedcomFilename("Ivanov Family Tree")).toBe(
      "ivanov-family-tree.ged",
    );
  });

  it("falls back to a default name when the tree name has no usable characters", () => {
    expect(buildGedcomFilename("   ")).toBe("family-tree.ged");
  });
});

describe("exportTreeAsGedcom", () => {
  function makeRepo(role: "owner" | "editor" | "viewer" | "none") {
    return {
      getRole: vi.fn().mockResolvedValue(role),
      getTree: vi.fn().mockResolvedValue({ id: "t1", name: "Ivanov Family" }),
      getMembers: vi.fn().mockResolvedValue([
        { id: "m1", firstName: "Elena", lastName: "Ivanova" },
        { id: "m2", firstName: "Madonna", lastName: null },
      ]),
      getRelationships: vi.fn().mockResolvedValue([]),
    };
  }

  it("allows an owner to export", async () => {
    const repo = makeRepo("owner");

    const result = await exportTreeAsGedcom({
      repo,
      treeId: "t1",
      actorUserId: "u1",
    });

    expect(result.filename).toBe("ivanov-family.ged");
    expect(result.content).toContain("0 @I1@ INDI\r\n1 NAME Elena /Ivanova/\r\n");
    expect(result.content).toContain("0 @I2@ INDI\r\n1 NAME Madonna //\r\n");
    expect(result.content).toContain("2 VERS 5.5.1");
    expect(result.content).toContain("1 CHAR UTF-8");
    expect(result.content.trimEnd().endsWith("0 TRLR")).toBe(true);
  });

  it("allows an editor to export", async () => {
    const repo = makeRepo("editor");

    await expect(
      exportTreeAsGedcom({ repo, treeId: "t1", actorUserId: "u1" }),
    ).resolves.toBeDefined();
  });

  it("allows a viewer to export", async () => {
    const repo = makeRepo("viewer");

    await expect(
      exportTreeAsGedcom({ repo, treeId: "t1", actorUserId: "u1" }),
    ).resolves.toBeDefined();
  });

  it("forbids a guest viewer (role none) from exporting", async () => {
    const repo = makeRepo("none");

    await expect(
      exportTreeAsGedcom({ repo, treeId: "t1", actorUserId: "u1" }),
    ).rejects.toThrow("ERR_FORBIDDEN");
  });

  it("throws when the tree does not exist", async () => {
    const repo = makeRepo("owner");
    repo.getTree.mockResolvedValue(null);

    await expect(
      exportTreeAsGedcom({ repo, treeId: "t1", actorUserId: "u1" }),
    ).rejects.toThrow("ERR_NOT_FOUND");
  });
});
