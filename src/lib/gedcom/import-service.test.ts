import { describe, expect, it, vi } from "vitest";
import { deriveTreeName, importGedcomTree } from "./import-service";

describe("deriveTreeName", () => {
  it("strips the extension from the uploaded filename", () => {
    expect(deriveTreeName("Smith Family.ged")).toBe("Smith Family");
  });

  it("falls back to 'Imported Tree' when the filename is empty", () => {
    expect(deriveTreeName("")).toBe("Imported Tree");
    expect(deriveTreeName(undefined)).toBe("Imported Tree");
    expect(deriveTreeName(null)).toBe("Imported Tree");
  });

  it("falls back to 'Imported Tree' when the filename is only an extension", () => {
    expect(deriveTreeName(".ged")).toBe("Imported Tree");
  });
});

describe("importGedcomTree", () => {
  it("parses the GEDCOM, maps members, and creates a tree via the repo", async () => {
    const text = [
      "0 @I1@ INDI",
      "1 NAME John /Smith/",
      "0 @I2@ INDI",
      "1 SEX F",
    ].join("\n");

    const createTreeWithMembers = vi.fn().mockResolvedValue({ treeId: "t1" });

    const result = await importGedcomTree({
      repo: { createTreeWithMembers },
      actorUserId: "u1",
      fileName: "Smith Family.ged",
      fileContent: text,
    });

    expect(createTreeWithMembers).toHaveBeenCalledWith({
      ownerId: "u1",
      name: "Smith Family",
      members: [
        { xrefId: "I1", firstName: "John", lastName: "Smith" },
        { xrefId: "I2", firstName: "Unknown", lastName: null },
      ],
    });

    expect(result).toEqual({
      treeId: "t1",
      report: { importedCount: 2, unknownNameCount: 1 },
    });
  });

  it("uses the 'Imported Tree' fallback name when no filename is provided", async () => {
    const createTreeWithMembers = vi.fn().mockResolvedValue({ treeId: "t1" });

    await importGedcomTree({
      repo: { createTreeWithMembers },
      actorUserId: "u1",
      fileName: null,
      fileContent: "0 @I1@ INDI\n1 NAME John /Smith/",
    });

    expect(createTreeWithMembers).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Imported Tree" }),
    );
  });
});
