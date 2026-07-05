import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getSessionMock,
  prismaMock,
  processFamilyPictureGenerationMock,
  reserveGenerationAllowanceMock,
  refundGenerationAllowanceMock,
  getAllowanceStatusMock,
} = vi.hoisted(() => {
  const getSessionMock = vi.fn();
  const prismaMock = {
    familyTree: { findUnique: vi.fn() },
    collaborator: { findUnique: vi.fn() },
    treeMember: { findMany: vi.fn() },
    familyPicture: { findMany: vi.fn(), create: vi.fn() },
    generation: { create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    getSessionMock,
    prismaMock,
    processFamilyPictureGenerationMock: vi.fn().mockResolvedValue(undefined),
    reserveGenerationAllowanceMock: vi.fn(),
    refundGenerationAllowanceMock: vi.fn().mockResolvedValue(undefined),
    getAllowanceStatusMock: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/family-picture/run-generation", () => ({
  processFamilyPictureGeneration: processFamilyPictureGenerationMock,
}));

vi.mock("@/lib/family-picture/allowance-ledger", () => ({
  reserveGenerationAllowance: reserveGenerationAllowanceMock,
  refundGenerationAllowance: refundGenerationAllowanceMock,
  getAllowanceStatus: getAllowanceStatusMock,
}));

const { GET, POST } = await import("./route");

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/trees/t1/family-pictures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/trees/[treeId]/family-pictures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prismaMock.generation.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockImplementation(async (cb) => cb(prismaMock));
    reserveGenerationAllowanceMock.mockResolvedValue({
      ok: true,
      resetAt: new Date("2026-08-01T00:00:00Z"),
    });
    getAllowanceStatusMock.mockResolvedValue({
      remaining: 7,
      resetAt: new Date("2026-08-01T00:00:00Z"),
    });
  });

  describe("POST", () => {
    it("creates a FamilyPicture + pending Generation and kicks off the async job", async () => {
      prismaMock.treeMember.findMany.mockResolvedValue([
        {
          id: "m1",
          firstName: "Alex",
          lastName: "Rusin",
          isLiving: true,
          birthYear: 1972,
          photoKey: "trees/t1/members/m1.webp",
          photoUrl: null,
        },
      ]);
      prismaMock.familyPicture.create.mockResolvedValue({ id: "fp1" });
      prismaMock.generation.create.mockResolvedValue({ id: "gen1" });

      const response = await POST(
        jsonRequest({
          memberIds: ["m1"],
          stylePreset: "bw",
          settingPreset: "garden",
        }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({
        familyPictureId: "fp1",
        generationId: "gen1",
      });
      expect(processFamilyPictureGenerationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          generationId: "gen1",
          familyPictureId: "fp1",
          referencePhotoKeys: ["trees/t1/members/m1.webp"],
          stylePreset: "bw",
          setting: { preset: "garden" },
        }),
      );
      expect(reserveGenerationAllowanceMock).toHaveBeenCalledWith(
        prismaMock,
        "user-1",
        expect.any(String),
      );
      const reservedBeforeTransaction =
        reserveGenerationAllowanceMock.mock.invocationCallOrder[0] <
        prismaMock.$transaction.mock.invocationCallOrder[0];
      expect(reservedBeforeTransaction).toBe(true);
    });

    it("hard-blocks a user at their monthly cap with the reset time and creates nothing", async () => {
      reserveGenerationAllowanceMock.mockResolvedValue({
        ok: false,
        resetAt: new Date("2026-08-01T00:00:00Z"),
      });
      prismaMock.treeMember.findMany.mockResolvedValue([
        {
          id: "m1",
          firstName: "Alex",
          lastName: "Rusin",
          isLiving: true,
          birthYear: 1972,
          photoKey: "trees/t1/members/m1.webp",
          photoUrl: null,
        },
      ]);

      const response = await POST(
        jsonRequest({ memberIds: ["m1"], stylePreset: "bw", settingPreset: "garden" }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        errorCode: "ERR_ALLOWANCE_EXHAUSTED",
        resetAt: "2026-08-01T00:00:00.000Z",
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(processFamilyPictureGenerationMock).not.toHaveBeenCalled();
    });

    it("rejects an ineligible member selection", async () => {
      prismaMock.treeMember.findMany.mockResolvedValue([
        {
          id: "m1",
          firstName: "Mila",
          lastName: null,
          isLiving: true,
          birthYear: 2017,
          photoKey: "trees/t1/members/m1.webp",
          photoUrl: null,
        },
      ]);

      const response = await POST(
        jsonRequest({ memberIds: ["m1"], stylePreset: "bw", settingPreset: "garden" }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        errorCode: "ERR_INELIGIBLE_MEMBERS",
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("rejects an unauthenticated (guest) request", async () => {
      getSessionMock.mockResolvedValue(null);

      const response = await POST(
        jsonRequest({ memberIds: ["m1"], stylePreset: "bw", settingPreset: "garden" }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(401);
    });

    it("rejects a request from someone with no role on the tree", async () => {
      prismaMock.familyTree.findUnique.mockResolvedValue({ ownerId: "someone-else" });
      prismaMock.collaborator.findUnique.mockResolvedValue(null);

      const response = await POST(
        jsonRequest({ memberIds: ["m1"], stylePreset: "bw", settingPreset: "garden" }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(403);
    });

    it("rejects an invalid style preset", async () => {
      const response = await POST(
        jsonRequest({ memberIds: ["m1"], stylePreset: "cyberpunk", settingPreset: "garden" }),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        errorCode: "ERR_INVALID_STYLE_PRESET",
      });
    });
  });

  describe("GET", () => {
    it("lists only the current user's family pictures, sweeping stranded generations first", async () => {
      prismaMock.familyPicture.findMany.mockResolvedValue([
        {
          id: "fp1",
          treeId: "t1",
          memberSnapshot: [],
          stylePreset: "bw",
          settingPreset: "garden",
          customPlace: null,
          createdAt: new Date("2026-07-01T00:00:00Z"),
          generations: [{ id: "gen1", status: "succeeded", errorMessage: null }],
          versions: [{ versionNumber: 1 }],
        },
      ]);

      const response = await GET(
        new NextRequest("http://localhost/api/trees/t1/family-pictures"),
        { params: Promise.resolve({ treeId: "t1" }) },
      );

      expect(prismaMock.generation.updateMany).toHaveBeenCalled();
      expect(prismaMock.familyPicture.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { treeId: "t1", userId: "user-1" } }),
      );
      await expect(response.json()).resolves.toEqual({
        familyPictures: [
          {
            id: "fp1",
            memberSnapshot: [],
            stylePreset: "bw",
            settingPreset: "garden",
            customPlace: null,
            createdAt: "2026-07-01T00:00:00.000Z",
            status: "succeeded",
            errorMessage: null,
            imageUrl: "/api/trees/t1/family-pictures/fp1/image",
          },
        ],
        remainingGenerations: 7,
        allowanceResetAt: "2026-08-01T00:00:00.000Z",
      });
    });
  });
});
