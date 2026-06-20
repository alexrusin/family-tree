import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  getTreeRoleMock,
  prismaMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const getTreeRoleMock = vi.fn();
  const prismaMock = {
    familyTree: {
      findUnique: vi.fn(),
    },
    treeMember: {
      findMany: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
}));

const { GET } = await import("./route");

describe("/api/trees/[treeId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({
      user: { id: "u-owner", email: "owner@example.com" },
    });
    getTreeRoleMock.mockResolvedValue("owner");

    prismaMock.familyTree.findUnique.mockResolvedValue({
      id: "t1",
      name: "Ivanov Family",
    });
    prismaMock.treeMember.findMany.mockResolvedValue([
      { id: "m1", firstName: "Elena", lastName: "Ivanova" },
      { id: "m2", firstName: "Madonna", lastName: null },
    ]);
    prismaMock.relationship.findMany.mockResolvedValue([]);
  });

  it("returns a GEDCOM file with attachment headers for an owner", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/export"),
      { params: Promise.resolve({ treeId: "t1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ivanov-family.ged"',
    );

    const body = await response.text();
    expect(body).toContain("0 HEAD");
    expect(body).toContain("2 VERS 5.5.1");
    expect(body).toContain("1 CHAR UTF-8");
    expect(body).toContain("0 @I1@ INDI\r\n1 NAME Elena /Ivanova/\r\n");
    expect(body).toContain("0 @I2@ INDI\r\n1 NAME Madonna //\r\n");
    expect(body.trimEnd().endsWith("0 TRLR")).toBe(true);
  });

  it("returns Content-Type text/plain for the GEDCOM file", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/export"),
      { params: Promise.resolve({ treeId: "t1" }) },
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
  });
});
