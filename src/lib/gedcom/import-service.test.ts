import { describe, expect, it, vi } from "vitest";
import {
  GedcomImportError,
  MAX_GEDCOM_FILE_BYTES,
  deriveTreeName,
  importGedcomTree,
} from "./import-service";

const baseReport = {
  unknownNameCount: 0,
  relationshipCount: 0,
  droppedDateCount: 0,
  inferredLivingCount: 0,
  danglingRelationshipCount: 0,
  skippedPlacesCount: 0,
  skippedEventsCount: 0,
  skippedSourcesCount: 0,
  skippedNotesCount: 0,
};

function toBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

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
      fileBuffer: toBuffer(text),
    });

    expect(createTreeWithMembers).toHaveBeenCalledWith({
      ownerId: "u1",
      name: "Smith Family",
      members: [
        expect.objectContaining({
          xrefId: "I1",
          firstName: "John",
          lastName: "Smith",
        }),
        expect.objectContaining({
          xrefId: "I2",
          firstName: "Unknown",
          lastName: null,
        }),
      ],
      relationships: [],
    });

    expect(result).toEqual({
      treeId: "t1",
      report: {
        ...baseReport,
        importedCount: 2,
        unknownNameCount: 1,
      },
    });
  });

  it("uses the 'Imported Tree' fallback name when no filename is provided", async () => {
    const createTreeWithMembers = vi.fn().mockResolvedValue({ treeId: "t1" });

    await importGedcomTree({
      repo: { createTreeWithMembers },
      actorUserId: "u1",
      fileName: null,
      fileBuffer: toBuffer("0 @I1@ INDI\n1 NAME John /Smith/"),
    });

    expect(createTreeWithMembers).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Imported Tree" }),
    );
  });

  it("reads known tags from files declaring GEDCOM 5.5, 5.5.5, or 7.0 without hard-failing", async () => {
    for (const version of ["5.5", "5.5.1", "5.5.5", "7.0"]) {
      const text = [
        "0 HEAD",
        "1 GEDC",
        `2 VERS ${version}`,
        "1 CHAR UTF-8",
        "0 @I1@ INDI",
        "1 NAME John /Smith/",
        "0 TRLR",
      ].join("\n");

      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      const result = await importGedcomTree({
        repo: { createTreeWithMembers },
        actorUserId: "u1",
        fileName: "tree.ged",
        fileBuffer: toBuffer(text),
      });

      expect(result.report.importedCount).toBe(1);
    }
  });

  describe("guards", () => {
    it("rejects a file declaring more than 300 individuals before any write", async () => {
      const lines: string[] = [];
      for (let i = 1; i <= 301; i += 1) {
        lines.push(`0 @I${i}@ INDI`, "1 NAME Person /Number/");
      }

      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      await expect(
        importGedcomTree({
          repo: { createTreeWithMembers },
          actorUserId: "u1",
          fileName: "big.ged",
          fileBuffer: toBuffer(lines.join("\n")),
        }),
      ).rejects.toMatchObject({
        code: "ERR_TOO_MANY_MEMBERS",
      });

      expect(createTreeWithMembers).not.toHaveBeenCalled();
    });

    it("rejects a file exceeding the byte cap", async () => {
      const oversized = "0 @I1@ INDI\n1 NAME " + "A".repeat(MAX_GEDCOM_FILE_BYTES + 1);
      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      await expect(
        importGedcomTree({
          repo: { createTreeWithMembers },
          actorUserId: "u1",
          fileName: "huge.ged",
          fileBuffer: toBuffer(oversized),
        }),
      ).rejects.toMatchObject({
        code: "ERR_FILE_TOO_LARGE",
      });

      expect(createTreeWithMembers).not.toHaveBeenCalled();
    });

    it("rejects a file declaring an unsupported encoding (e.g. ANSEL) without creating a tree", async () => {
      const text = [
        "0 HEAD",
        "1 CHAR ANSEL",
        "0 @I1@ INDI",
        "1 NAME John /Smith/",
        "0 TRLR",
      ].join("\n");

      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      await expect(
        importGedcomTree({
          repo: { createTreeWithMembers },
          actorUserId: "u1",
          fileName: "ansel.ged",
          fileBuffer: toBuffer(text),
        }),
      ).rejects.toMatchObject({
        code: "ERR_UNSUPPORTED_ENCODING",
      });

      expect(createTreeWithMembers).not.toHaveBeenCalled();
    });

    it("rejects a UTF-16 encoded file without creating a tree", async () => {
      const text = "0 @I1@ INDI\n1 NAME John /Smith/";
      const utf16 = Buffer.from("﻿" + text, "utf16le");
      const buffer = utf16.buffer.slice(
        utf16.byteOffset,
        utf16.byteOffset + utf16.byteLength,
      ) as ArrayBuffer;

      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      await expect(
        importGedcomTree({
          repo: { createTreeWithMembers },
          actorUserId: "u1",
          fileName: "utf16.ged",
          fileBuffer: buffer,
        }),
      ).rejects.toMatchObject({
        code: "ERR_UNSUPPORTED_ENCODING",
      });

      expect(createTreeWithMembers).not.toHaveBeenCalled();
    });

    it("rejects a file with no recognizable GEDCOM records as invalid", async () => {
      const createTreeWithMembers = vi
        .fn()
        .mockResolvedValue({ treeId: "t1" });

      await expect(
        importGedcomTree({
          repo: { createTreeWithMembers },
          actorUserId: "u1",
          fileName: "notes.txt",
          fileBuffer: toBuffer("just some random text\nwith no gedcom lines"),
        }),
      ).rejects.toMatchObject({
        code: "ERR_INVALID_GEDCOM",
      });

      expect(createTreeWithMembers).not.toHaveBeenCalled();
    });
  });

  it("propagates a mid-import write failure without swallowing it (atomic rollback)", async () => {
    const text = "0 @I1@ INDI\n1 NAME John /Smith/";
    const createTreeWithMembers = vi
      .fn()
      .mockRejectedValue(new Error("write failed"));

    await expect(
      importGedcomTree({
        repo: { createTreeWithMembers },
        actorUserId: "u1",
        fileName: "tree.ged",
        fileBuffer: toBuffer(text),
      }),
    ).rejects.toThrow("write failed");
  });

  it("exposes GedcomImportError instances with their error code", async () => {
    const createTreeWithMembers = vi.fn();

    try {
      await importGedcomTree({
        repo: { createTreeWithMembers },
        actorUserId: "u1",
        fileName: "huge.ged",
        fileBuffer: toBuffer(
          "0 @I1@ INDI\n1 NAME " + "A".repeat(MAX_GEDCOM_FILE_BYTES + 1),
        ),
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(GedcomImportError);
      expect((error as GedcomImportError).code).toBe("ERR_FILE_TOO_LARGE");
    }
  });
});
