import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaMock, prismaClientCtorMock, prismaPgMock } =
  vi.hoisted(() => {
    const getSessionMock = vi.fn();

    const txMock = {
      familyTree: {
        create: vi.fn(),
      },
      treeMember: {
        createMany: vi.fn(),
      },
      relationship: {
        createMany: vi.fn(),
      },
    };

    const prismaMock = {
      $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) =>
        callback(txMock),
      ),
      __tx: txMock,
    };

    return {
      getSessionMock,
      prismaMock,
      prismaClientCtorMock: vi.fn(function PrismaClientMock() {
        return prismaMock;
      }),
      prismaPgMock: vi.fn(function PrismaPgMock() {
        return {};
      }),
    };
  });

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: prismaClientCtorMock,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: prismaPgMock,
}));

const { POST } = await import("./route");

function buildRequest(file: File | null) {
  const formData = new FormData();
  if (file) {
    formData.set("file", file);
  }

  return new NextRequest("http://localhost/api/trees/import", {
    method: "POST",
    body: formData,
  });
}

describe("/api/trees/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "user@example.com" },
    });

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock.__tx) => unknown) =>
        callback(prismaMock.__tx),
    );

    prismaMock.__tx.familyTree.create.mockResolvedValue({ id: "tree-1" });
    prismaMock.__tx.treeMember.createMany.mockResolvedValue({ count: 2 });
    prismaMock.__tx.relationship.createMany.mockResolvedValue({ count: 0 });
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const file = new File(["0 @I1@ INDI\n1 NAME John /Smith/"], "tree.ged");
    const response = await POST(buildRequest(file));

    expect(response.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    const response = await POST(buildRequest(null));

    expect(response.status).toBe(400);
    expect((await response.json()).errorCode).toBe("ERR_NO_FILE");
  });

  it("creates a new tree and members from the uploaded GEDCOM file", async () => {
    const text = [
      "0 @I1@ INDI",
      "1 NAME John /Smith/",
      "0 @I2@ INDI",
      "1 SEX F",
    ].join("\n");
    const file = new File([text], "Smith Family.ged");

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.treeId).toBe("tree-1");
    expect(body.report).toEqual({
      importedCount: 2,
      unknownNameCount: 1,
      relationshipCount: 0,
      droppedDateCount: 0,
      inferredLivingCount: 0,
      danglingRelationshipCount: 0,
      skippedPlacesCount: 0,
      skippedEventsCount: 0,
      skippedSourcesCount: 0,
      skippedNotesCount: 0,
    });

    expect(prismaMock.__tx.familyTree.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Smith Family",
        ownerId: "u1",
        memberCount: 2,
      }),
    });

    expect(prismaMock.__tx.treeMember.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          treeId: "tree-1",
          firstName: "John",
          lastName: "Smith",
          gender: "undisclosed",
          isLiving: false,
        }),
        expect.objectContaining({
          treeId: "tree-1",
          firstName: "Unknown",
          lastName: null,
          gender: "female",
          isLiving: false,
        }),
      ],
    });

    expect(prismaMock.__tx.relationship.createMany).not.toHaveBeenCalled();
  });

  it("returns ERR_TOO_MANY_MEMBERS and does not write when the file declares too many individuals", async () => {
    const lines: string[] = [];
    for (let i = 1; i <= 301; i += 1) {
      lines.push(`0 @I${i}@ INDI`, "1 NAME Person /Number/");
    }
    const file = new File([lines.join("\n")], "big.ged");

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_TOO_MANY_MEMBERS");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns ERR_FILE_TOO_LARGE and does not write when the file exceeds the byte cap", async () => {
    const oversized =
      "0 @I1@ INDI\n1 NAME " + "A".repeat(5 * 1024 * 1024 + 1);
    const file = new File([oversized], "huge.ged");

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_FILE_TOO_LARGE");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns ERR_UNSUPPORTED_ENCODING and does not write for an ANSEL-encoded file", async () => {
    const text = [
      "0 HEAD",
      "1 CHAR ANSEL",
      "0 @I1@ INDI",
      "1 NAME John /Smith/",
      "0 TRLR",
    ].join("\n");
    const file = new File([text], "ansel.ged");

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_UNSUPPORTED_ENCODING");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns ERR_INVALID_GEDCOM and does not write for a non-GEDCOM file", async () => {
    const file = new File(["just some random text"], "notes.txt");

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_INVALID_GEDCOM");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns ERR_INTERNAL and does not return a treeId when the write transaction fails", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db error"));

    const file = new File(
      ["0 @I1@ INDI\n1 NAME John /Smith/"],
      "tree.ged",
    );

    const response = await POST(buildRequest(file));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.errorCode).toBe("ERR_INTERNAL");
    expect(body.treeId).toBeUndefined();
  });
});
