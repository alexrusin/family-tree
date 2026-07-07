import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSessionMock, prismaMock } = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaMock = {
    familyTree: { findUnique: vi.fn() },
    collaborator: { findUnique: vi.fn() },
    familyPicture: { findFirst: vi.fn(), update: vi.fn() },
    familyPictureVersion: { findUnique: vi.fn() },
  };
  return { getSessionMock, prismaMock };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { POST } = await import("./route");

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/trees/t1/family-pictures/fp1/revert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ treeId: "t1", familyPictureId: "fp1" }) };
}

describe("/api/trees/[treeId]/family-pictures/[familyPictureId]/revert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prismaMock.familyPicture.findFirst.mockResolvedValue({ userId: "user-1" });
    prismaMock.familyPictureVersion.findUnique.mockResolvedValue({ versionNumber: 1 });
    prismaMock.familyPicture.update.mockResolvedValue({});
  });

  it("points the Family Picture's current Version at the chosen earlier Version, for free", async () => {
    const response = await POST(jsonRequest({ versionNumber: 1 }), params());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      familyPictureId: "fp1",
      currentVersionNumber: 1,
    });
    expect(prismaMock.familyPictureVersion.findUnique).toHaveBeenCalledWith({
      where: { familyPictureId_versionNumber: { familyPictureId: "fp1", versionNumber: 1 } },
      select: { versionNumber: true },
    });
    expect(prismaMock.familyPicture.update).toHaveBeenCalledWith({
      where: { id: "fp1" },
      data: { currentVersionNumber: 1 },
    });
  });

  it("rejects a missing versionNumber", async () => {
    const response = await POST(jsonRequest({}), params());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_VERSION_REQUIRED" });
    expect(prismaMock.familyPicture.update).not.toHaveBeenCalled();
  });

  it("404s when the Family Picture doesn't belong to the caller", async () => {
    prismaMock.familyPicture.findFirst.mockResolvedValue({ userId: "someone-else" });

    const response = await POST(jsonRequest({ versionNumber: 1 }), params());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_NOT_FOUND" });
    expect(prismaMock.familyPicture.update).not.toHaveBeenCalled();
  });

  it("404s when the requested Version doesn't belong to this Family Picture", async () => {
    prismaMock.familyPictureVersion.findUnique.mockResolvedValue(null);

    const response = await POST(jsonRequest({ versionNumber: 99 }), params());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ errorCode: "ERR_VERSION_NOT_FOUND" });
    expect(prismaMock.familyPicture.update).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated (guest) request", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(jsonRequest({ versionNumber: 1 }), params());

    expect(response.status).toBe(401);
  });

  it("rejects a request from someone with no role on the tree", async () => {
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "someone-else" });
    prismaMock.collaborator.findUnique.mockResolvedValue(null);

    const response = await POST(jsonRequest({ versionNumber: 1 }), params());

    expect(response.status).toBe(403);
  });
});
