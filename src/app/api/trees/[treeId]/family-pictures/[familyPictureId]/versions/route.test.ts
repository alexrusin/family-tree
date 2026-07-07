import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaMock = {
    familyTree: { findUnique: vi.fn() },
    collaborator: { findUnique: vi.fn() },
    familyPicture: { findFirst: vi.fn() },
  };
  return { getSessionMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

function params() {
  return { params: Promise.resolve({ treeId: "t1", familyPictureId: "fp1" }) };
}

describe("/api/trees/[treeId]/family-pictures/[familyPictureId]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "user-1" });
  });

  it("returns the full ordered Version history, newest first, with the current one flagged", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "user-1",
      currentVersionNumber: 1,
      versions: [
        { versionNumber: 2, createdAt: new Date("2026-07-02T00:00:00Z") },
        { versionNumber: 1, createdAt: new Date("2026-07-01T00:00:00Z") },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/versions"),
      params(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      versions: [
        {
          versionNumber: 2,
          createdAt: "2026-07-02T00:00:00.000Z",
          isCurrent: false,
          imageUrl: "/api/trees/t1/family-pictures/fp1/image?v=2",
        },
        {
          versionNumber: 1,
          createdAt: "2026-07-01T00:00:00.000Z",
          isCurrent: true,
          imageUrl: "/api/trees/t1/family-pictures/fp1/image?v=1",
        },
      ],
    });
  });

  it("falls back to the latest Version as current when no revert has happened", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "user-1",
      currentVersionNumber: null,
      versions: [
        { versionNumber: 2, createdAt: new Date("2026-07-02T00:00:00Z") },
        { versionNumber: 1, createdAt: new Date("2026-07-01T00:00:00Z") },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/versions"),
      params(),
    );

    const body = (await response.json()) as { versions: { versionNumber: number; isCurrent: boolean }[] };
    expect(body.versions.find((v) => v.versionNumber === 2)?.isCurrent).toBe(true);
  });

  it("404s when the Family Picture doesn't belong to the caller", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({
      userId: "someone-else",
      currentVersionNumber: 1,
      versions: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/versions"),
      params(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
  });

  it("rejects an unauthenticated (guest) request", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/versions"),
      params(),
    );

    expect(response.status).toBe(401);
  });
});
