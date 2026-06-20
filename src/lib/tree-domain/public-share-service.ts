import { createHash } from "crypto";
import { generateShareToken } from "@/lib/tree-utils";
import { DomainError } from "@/lib/domain-error";
import type { Locale } from "@/lib/locale";
import type { TreeRole } from "./tree-access";

export type PublicShareStatus =
  | "active"
  | "disabled"
  | "regenerated"
  | "unknown";

export function hashPublicShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function resolvePublicShareToken(
  repo: {
    findTreeByActiveToken: (token: string) => Promise<{
      id: string;
      ownerId: string;
      ownerLocale: Locale;
      shareEnabled: boolean;
    } | null>;
    findHistoricalToken: (
      tokenHash: string,
    ) => Promise<{ treeId: string } | null>;
  },
  token: string,
): Promise<{
  status: PublicShareStatus;
  treeId?: string;
  ownerLocale?: Locale;
}> {
  const active = await repo.findTreeByActiveToken(token);
  if (active) {
    if (!active.shareEnabled) {
      return {
        status: "disabled",
        treeId: active.id,
        ownerLocale: active.ownerLocale,
      };
    }

    return {
      status: "active",
      treeId: active.id,
      ownerLocale: active.ownerLocale,
    };
  }

  const historical = await repo.findHistoricalToken(
    hashPublicShareToken(token),
  );
  if (historical) {
    return { status: "regenerated", treeId: historical.treeId };
  }

  return { status: "unknown" };
}

export async function setPublicShareEnabled(params: {
  repo: {
    getTreeRole: (treeId: string, actorUserId: string) => Promise<TreeRole>;
    updateShareEnabled: (treeId: string, enabled: boolean) => Promise<void>;
  };
  treeId: string;
  actorUserId: string;
  enabled: boolean;
}): Promise<void> {
  const role = await params.repo.getTreeRole(params.treeId, params.actorUserId);
  if (role !== "owner") {
    throw new DomainError("ERR_FORBIDDEN");
  }

  await params.repo.updateShareEnabled(params.treeId, params.enabled);
}

export async function regeneratePublicShareToken(params: {
  repo: {
    getTreeRole: (treeId: string, actorUserId: string) => Promise<TreeRole>;
    getCurrentShareToken: (treeId: string) => Promise<string>;
    atomicRegenerateToken: (
      treeId: string,
      oldTokenHash: string,
      nextToken: string,
    ) => Promise<{ treeId: string; shareToken: string }>;
  };
  treeId: string;
  actorUserId: string;
  nextTokenFactory?: () => string;
}): Promise<{ treeId: string; shareToken: string }> {
  const role = await params.repo.getTreeRole(params.treeId, params.actorUserId);
  if (role !== "owner") {
    throw new DomainError("ERR_FORBIDDEN");
  }

  const current = await params.repo.getCurrentShareToken(params.treeId);
  const nextToken = (params.nextTokenFactory ?? generateShareToken)();
  return params.repo.atomicRegenerateToken(
    params.treeId,
    hashPublicShareToken(current),
    nextToken,
  );
}
