import { withTreeRole } from "@/lib/with-tree-role";
import {
  resolveFamilyPictureEligibility,
  type EligibilityCandidate,
} from "@/lib/family-picture/eligibility";
import {
  FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH,
  isSettingPresetId,
  isStylePresetId,
} from "@/lib/family-picture/preset-catalog";
import type { Setting, SettingPresetId } from "@/lib/family-picture/prompt-builder";
import { resolveTreeMemberPhotoUrl } from "@/lib/tree-domain/member-photo";
import { sweepStrandedGenerations } from "@/lib/family-picture/stranded-sweep";
import { processFamilyPictureGeneration } from "@/lib/family-picture/run-generation";
import {
  getAllowanceStatus,
  refundGenerationAllowance,
  reserveGenerationAllowance,
} from "@/lib/family-picture/allowance-ledger";
import { getGlobalBudgetStatus } from "@/lib/family-picture/global-budget";
import type { GenerationStatus } from "@/generated/prisma/enums";
import { randomUUID } from "crypto";

export interface FamilyPictureMemberSnapshot {
  id: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
}

function toFamilyPictureSummary(picture: {
  id: string;
  treeId: string;
  memberSnapshot: unknown;
  stylePreset: string;
  settingPreset: string | null;
  customPlace: string | null;
  createdAt: Date;
  generations: { id: string; status: GenerationStatus; errorMessage: string | null }[];
  versions: { versionNumber: number }[];
}) {
  const latestGeneration = picture.generations[0] ?? null;
  const hasImage = picture.versions.length > 0;

  return {
    id: picture.id,
    memberSnapshot: picture.memberSnapshot as FamilyPictureMemberSnapshot[],
    stylePreset: picture.stylePreset,
    settingPreset: picture.settingPreset,
    customPlace: picture.customPlace,
    createdAt: picture.createdAt.toISOString(),
    status: latestGeneration?.status ?? "pending",
    errorMessage: latestGeneration?.errorMessage ?? null,
    imageUrl: hasImage
      ? `/api/trees/${picture.treeId}/family-pictures/${picture.id}/image`
      : null,
  };
}

export const GET = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  await sweepStrandedGenerations(ctx.prisma);

  const [pictures, allowance] = await Promise.all([
    ctx.prisma.familyPicture.findMany({
      where: { treeId, userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        generations: { orderBy: { createdAt: "desc" }, take: 1 },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    }),
    getAllowanceStatus(ctx.prisma, ctx.user.id),
  ]);

  return Response.json(
    {
      familyPictures: pictures.map(toFamilyPictureSummary),
      remainingGenerations: allowance.remaining,
      allowanceResetAt: allowance.resetAt.toISOString(),
    },
    { status: 200 },
  );
});

export const POST = withTreeRole("viewer", async (ctx) => {
  const { treeId } = ctx.params;

  // Operator-side global kill-switch: checked first, ahead of any per-user
  // work or paid call, so a viral spike can never blow past the budget.
  const budgetStatus = await getGlobalBudgetStatus(ctx.prisma);
  if (budgetStatus === "closed") {
    return Response.json({ errorCode: "ERR_FEATURE_PAUSED" }, { status: 503 });
  }

  const body = await ctx.request.json().catch(() => null);

  const memberIds = body?.memberIds;
  if (!Array.isArray(memberIds) || memberIds.length === 0 || memberIds.some((id) => typeof id !== "string")) {
    return Response.json({ errorCode: "ERR_MEMBERS_REQUIRED" }, { status: 400 });
  }

  const stylePreset = body?.stylePreset;
  if (typeof stylePreset !== "string" || !isStylePresetId(stylePreset)) {
    return Response.json({ errorCode: "ERR_INVALID_STYLE_PRESET" }, { status: 400 });
  }

  const settingPresetRaw = body?.settingPreset;
  const customPlaceRaw = body?.customPlace;
  let settingPreset: SettingPresetId | null = null;
  let customPlace: string | null = null;

  if (typeof settingPresetRaw === "string" && settingPresetRaw.length > 0) {
    if (!isSettingPresetId(settingPresetRaw)) {
      return Response.json({ errorCode: "ERR_INVALID_SETTING" }, { status: 400 });
    }
    settingPreset = settingPresetRaw;
  } else if (typeof customPlaceRaw === "string" && customPlaceRaw.trim().length > 0) {
    const trimmed = customPlaceRaw.trim();
    if (trimmed.length > FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH) {
      return Response.json({ errorCode: "ERR_TEXT_TOO_LONG" }, { status: 400 });
    }
    customPlace = trimmed;
  } else {
    return Response.json({ errorCode: "ERR_INVALID_SETTING" }, { status: 400 });
  }

  let personalTouch: string | null = null;
  if (typeof body?.personalTouch === "string" && body.personalTouch.trim().length > 0) {
    const trimmed = body.personalTouch.trim();
    if (trimmed.length > FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH) {
      return Response.json({ errorCode: "ERR_TEXT_TOO_LONG" }, { status: 400 });
    }
    personalTouch = trimmed;
  }

  const members = await ctx.prisma.treeMember.findMany({
    where: { id: { in: memberIds }, treeId },
  });

  if (members.length !== memberIds.length) {
    return Response.json({ errorCode: "ERR_MEMBER_NOT_FOUND" }, { status: 400 });
  }

  const candidates: EligibilityCandidate[] = members.map((member) => ({
    id: member.id,
    isLiving: member.isLiving,
    birthYear: member.birthYear,
    hasProfilePhoto: !!member.photoKey,
  }));

  const decisions = resolveFamilyPictureEligibility(candidates, new Date());
  const ineligible = decisions.filter((d) => !d.eligible);
  if (ineligible.length > 0) {
    return Response.json(
      { errorCode: "ERR_INELIGIBLE_MEMBERS", ineligible },
      { status: 400 },
    );
  }

  const memberSnapshot: FamilyPictureMemberSnapshot[] = members.map((member) => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    photoUrl: resolveTreeMemberPhotoUrl({
      treeId,
      memberId: member.id,
      photoKey: member.photoKey,
      storedPhotoUrl: member.photoUrl,
    }),
  }));

  // Reserve the allowance slot before any paid work — and before creating the
  // Generation row itself — so a user at their cap is hard-blocked
  // synchronously with no Generation ever created.
  const reservationId = randomUUID();
  const reservation = await reserveGenerationAllowance(ctx.prisma, ctx.user.id, reservationId);
  if (!reservation.ok) {
    return Response.json(
      { errorCode: "ERR_ALLOWANCE_EXHAUSTED", resetAt: reservation.resetAt.toISOString() },
      { status: 403 },
    );
  }

  let familyPicture: { id: string };
  let generation: { id: string };
  try {
    ({ familyPicture, generation } = await ctx.prisma.$transaction(async (tx) => {
      const familyPicture = await tx.familyPicture.create({
        data: {
          userId: ctx.user.id,
          treeId,
          memberSnapshot,
          stylePreset,
          settingPreset,
          customPlace,
          personalTouch,
        },
      });

      const generation = await tx.generation.create({
        data: {
          id: reservationId,
          userId: ctx.user.id,
          familyPictureId: familyPicture.id,
          status: "pending",
        },
      });

      return { familyPicture, generation };
    }));
  } catch (error) {
    await refundGenerationAllowance(ctx.prisma, reservationId);
    throw error;
  }

  const setting: Setting = settingPreset
    ? { preset: settingPreset }
    : { place: customPlace ?? "" };

  processFamilyPictureGeneration({
    generationId: generation.id,
    familyPictureId: familyPicture.id,
    userId: ctx.user.id,
    referencePhotoKeys: members.map((m) => m.photoKey as string),
    stylePreset,
    setting,
    personalTouch,
  }).catch((error) => {
    console.error("Family Picture generation crashed", error);
  });

  return Response.json(
    { familyPictureId: familyPicture.id, generationId: generation.id },
    { status: 202 },
  );
});
