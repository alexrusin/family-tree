import { describe, expect, it, vi } from "vitest";
import {
  resolvePublicShareToken,
  setPublicShareEnabled,
  regeneratePublicShareToken,
  hashPublicShareToken,
} from "./public-share-service";

describe("public-share-service", () => {
  it("returns active when token exists and sharing enabled", async () => {
    const repo = {
      findTreeByActiveToken: vi.fn().mockResolvedValue({
        id: "t1",
        ownerId: "u1",
        ownerLocale: "ru",
        shareEnabled: true,
      }),
      findHistoricalToken: vi.fn().mockResolvedValue(null),
    };

    const result = await resolvePublicShareToken(repo, "token-active");
    expect(result.status).toBe("active");
    expect(result.treeId).toBe("t1");
    expect(result.ownerLocale).toBe("ru");
  });

  it("returns disabled when active token exists but sharing is off", async () => {
    const repo = {
      findTreeByActiveToken: vi.fn().mockResolvedValue({
        id: "t1",
        ownerId: "u1",
        ownerLocale: "en",
        shareEnabled: false,
      }),
      findHistoricalToken: vi.fn().mockResolvedValue(null),
    };

    const result = await resolvePublicShareToken(repo, "token-disabled");
    expect(result.status).toBe("disabled");
  });

  it("returns regenerated when token hash exists in history", async () => {
    const repo = {
      findTreeByActiveToken: vi.fn().mockResolvedValue(null),
      findHistoricalToken: vi.fn().mockResolvedValue({ treeId: "t1" }),
    };

    const result = await resolvePublicShareToken(repo, "token-old");
    expect(result.status).toBe("regenerated");
  });

  it("returns unknown when token is not active and not historical", async () => {
    const repo = {
      findTreeByActiveToken: vi.fn().mockResolvedValue(null),
      findHistoricalToken: vi.fn().mockResolvedValue(null),
    };

    const result = await resolvePublicShareToken(repo, "token-unknown");
    expect(result.status).toBe("unknown");
  });

  it("forbids enabling share link when actor is not owner", async () => {
    await expect(
      setPublicShareEnabled({
        repo: {
          getTreeRole: vi.fn().mockResolvedValue("editor"),
          updateShareEnabled: vi.fn(),
        },
        treeId: "t1",
        actorUserId: "u2",
        enabled: true,
      }),
    ).rejects.toThrow("ERR_FORBIDDEN");
  });

  it("regenerates token and records old token hash", async () => {
    const repo = {
      getTreeRole: vi.fn().mockResolvedValue("owner"),
      getCurrentShareToken: vi.fn().mockResolvedValue("old-token"),
      atomicRegenerateToken: vi.fn().mockResolvedValue({
        treeId: "t1",
        shareToken: "new-token",
      }),
    };

    const result = await regeneratePublicShareToken({
      repo,
      treeId: "t1",
      actorUserId: "u1",
      nextTokenFactory: () => "new-token",
    });

    expect(repo.atomicRegenerateToken).toHaveBeenCalledWith(
      "t1",
      hashPublicShareToken("old-token"),
      "new-token",
    );
    expect(result.shareToken).toBe("new-token");
  });
});
