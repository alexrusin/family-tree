import { describe, it, expect, vi } from "vitest";
import {
  acceptInvitation,
  changeCollaboratorRole,
  createOrRefreshInvitation,
  leaveTree,
  removeCollaborator,
} from "./collaboration-service";

describe("createOrRefreshInvitation", () => {
  it("upserts pending invitation and rotates token hash", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("owner"),
      findAcceptedCollaboratorByEmail: vi.fn().mockResolvedValue(null),
      findPendingInvitationByEmail: vi.fn().mockResolvedValue({ id: "i1" }),
      upsertPendingInvitation: vi
        .fn()
        .mockResolvedValue({ id: "i1", status: "pending" }),
    };

    const result = await createOrRefreshInvitation({
      repo,
      actorUserId: "u-owner",
      treeId: "t1",
      invitedEmail: " Cousin@Example.com ",
      role: "editor",
      locale: "en",
      message: "join us",
      tokenHash: "hash-2",
      expiresAt: new Date("2026-05-21T00:00:00.000Z"),
    });

    expect(result.status).toBe("pending");
    expect(repo.findPendingInvitationByEmail).toHaveBeenCalledWith(
      "t1",
      "cousin@example.com",
    );
    expect(repo.upsertPendingInvitation).toHaveBeenCalledWith({
      treeId: "t1",
      invitedEmail: "cousin@example.com",
      role: "editor",
      locale: "en",
      message: "join us",
      tokenHash: "hash-2",
      expiresAt: new Date("2026-05-21T00:00:00.000Z"),
    });
  });

  it("rejects if invited email already accepted collaborator", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("owner"),
      findAcceptedCollaboratorByEmail: vi.fn().mockResolvedValue({ id: "c1" }),
      findPendingInvitationByEmail: vi.fn(),
      upsertPendingInvitation: vi.fn(),
    };

    await expect(
      createOrRefreshInvitation({
        repo,
        actorUserId: "u-owner",
        treeId: "t1",
        invitedEmail: "cousin@example.com",
        role: "viewer",
        locale: "en",
        message: null,
        tokenHash: "hash",
        expiresAt: new Date("2026-05-21T00:00:00.000Z"),
      }),
    ).rejects.toThrow("ERR_ALREADY_COLLABORATOR");

    expect(repo.upsertPendingInvitation).not.toHaveBeenCalled();
  });
});

describe("acceptInvitation", () => {
  it("accepts when user email matches invitation", async () => {
    const now = new Date("2026-05-14T00:00:00.000Z");
    const repo = {
      findActiveInvitationByTokenHash: vi.fn().mockResolvedValue({
        id: "i1",
        treeId: "t1",
        invitedEmail: "invitee@example.com",
        role: "editor",
        expiresAt: new Date("2026-05-20T00:00:00.000Z"),
      }),
      upsertCollaborator: vi
        .fn()
        .mockResolvedValue({ id: "c1", treeId: "t1", role: "editor" }),
      markInvitationAccepted: vi.fn().mockResolvedValue(undefined),
    };

    const result = await acceptInvitation({
      repo,
      tokenHash: "hash",
      actorUserId: "u-invitee",
      actorEmail: " Invitee@Example.com ",
      now,
    });

    expect(result).toEqual({ treeId: "t1", role: "editor" });
    expect(repo.upsertCollaborator).toHaveBeenCalledWith({
      treeId: "t1",
      userId: "u-invitee",
      role: "editor",
      acceptedAt: now,
    });
    expect(repo.markInvitationAccepted).toHaveBeenCalledWith("i1", now);
  });

  it("rejects when account email does not match invited email", async () => {
    const repo = {
      findActiveInvitationByTokenHash: vi.fn().mockResolvedValue({
        id: "i1",
        treeId: "t1",
        invitedEmail: "invitee@example.com",
        role: "viewer",
        expiresAt: new Date("2026-05-20T00:00:00.000Z"),
      }),
      upsertCollaborator: vi.fn(),
      markInvitationAccepted: vi.fn(),
    };

    await expect(
      acceptInvitation({
        repo,
        tokenHash: "hash",
        actorUserId: "u-other",
        actorEmail: "other@example.com",
        now: new Date("2026-05-14T00:00:00.000Z"),
      }),
    ).rejects.toThrow("ERR_INVITATION_EMAIL_MISMATCH");

    expect(repo.upsertCollaborator).not.toHaveBeenCalled();
    expect(repo.markInvitationAccepted).not.toHaveBeenCalled();
  });
});

describe("changeCollaboratorRole", () => {
  it("allows owner to change collaborator role", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("owner"),
      updateCollaboratorRole: vi.fn().mockResolvedValue(undefined),
    };

    await changeCollaboratorRole({
      repo,
      actorUserId: "u-owner",
      treeId: "t1",
      collaboratorId: "c1",
      role: "viewer",
    });

    expect(repo.updateCollaboratorRole).toHaveBeenCalledWith(
      "t1",
      "c1",
      "viewer",
    );
  });

  it("rejects non-owner role changes", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("editor"),
      updateCollaboratorRole: vi.fn(),
    };

    await expect(
      changeCollaboratorRole({
        repo,
        actorUserId: "u-editor",
        treeId: "t1",
        collaboratorId: "c1",
        role: "viewer",
      }),
    ).rejects.toThrow("ERR_FORBIDDEN");

    expect(repo.updateCollaboratorRole).not.toHaveBeenCalled();
  });
});

describe("removeCollaborator", () => {
  it("allows owner to remove collaborator", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("owner"),
      deleteCollaborator: vi.fn().mockResolvedValue(undefined),
    };

    await removeCollaborator({
      repo,
      actorUserId: "u-owner",
      treeId: "t1",
      collaboratorId: "c1",
    });

    expect(repo.deleteCollaborator).toHaveBeenCalledWith("t1", "c1");
  });

  it("rejects non-owner removals", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("viewer"),
      deleteCollaborator: vi.fn(),
    };

    await expect(
      removeCollaborator({
        repo,
        actorUserId: "u-viewer",
        treeId: "t1",
        collaboratorId: "c1",
      }),
    ).rejects.toThrow("ERR_FORBIDDEN");

    expect(repo.deleteCollaborator).not.toHaveBeenCalled();
  });
});

describe("leaveTree", () => {
  it("rejects when owner tries to leave", async () => {
    const repo = {
      getActorRole: vi.fn().mockResolvedValue("owner"),
      deleteCollaboratorByUser: vi.fn(),
    };

    await expect(
      leaveTree({
        repo,
        actorUserId: "u-owner",
        treeId: "t1",
      }),
    ).rejects.toThrow("ERR_OWNER_CANNOT_LEAVE");

    expect(repo.deleteCollaboratorByUser).not.toHaveBeenCalled();
  });
});