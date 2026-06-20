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
    collaborator: {
      delete: vi.fn(),
    },
  };

  return {
    getSessionMock,
    getTreeRoleMock,
    prismaMock,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tree-domain/tree-access", () => ({
  getTreeRole: getTreeRoleMock,
}));

const { POST } = await import("./route");

describe("/api/trees/[treeId]/collaboration/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSessionMock.mockResolvedValue({ user: { id: "u-editor" } });
    getTreeRoleMock.mockResolvedValue("editor");
    prismaMock.collaborator.delete.mockResolvedValue({ id: "c1" });
  });

  it("returns 400 when owner tries to leave", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u-owner" } });
    getTreeRoleMock.mockResolvedValue("owner");

    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "ERR_OWNER_CANNOT_LEAVE",
    });
    expect(prismaMock.collaborator.delete).not.toHaveBeenCalled();
  });

  it("allows accepted non-owner collaborator to leave", async () => {
    const request = new NextRequest(
      "http://localhost/api/trees/t1/collaboration/leave",
      {
        method: "POST",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ treeId: "t1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.collaborator.delete).toHaveBeenCalledWith({
      where: {
        treeId_userId: {
          treeId: "t1",
          userId: "u-editor",
        },
      },
    });
  });
});
