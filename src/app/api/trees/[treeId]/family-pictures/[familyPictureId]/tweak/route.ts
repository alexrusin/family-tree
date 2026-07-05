import { withTreeRole } from "@/lib/with-tree-role";
import { FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH } from "@/lib/family-picture/preset-catalog";
import { processFamilyPictureTweak } from "@/lib/family-picture/run-generation";
import {
  refundGenerationAllowance,
  reserveGenerationAllowance,
} from "@/lib/family-picture/allowance-ledger";
import { getGlobalBudgetStatus } from "@/lib/family-picture/global-budget";
import { randomUUID } from "crypto";

export const POST = withTreeRole<{ treeId: string; familyPictureId: string }>(
  "viewer",
  async (ctx) => {
    const { familyPictureId } = ctx.params;

    // Same operator-side global kill-switch as initial generation, checked
    // first and ahead of any per-user work or paid call.
    const budgetStatus = await getGlobalBudgetStatus(ctx.prisma);
    if (budgetStatus === "closed") {
      return Response.json({ errorCode: "ERR_FEATURE_PAUSED" }, { status: 503 });
    }

    const body = await ctx.request.json().catch(() => null);
    const instructionRaw = body?.instruction;
    if (typeof instructionRaw !== "string" || instructionRaw.trim().length === 0) {
      return Response.json({ errorCode: "ERR_INSTRUCTION_REQUIRED" }, { status: 400 });
    }
    const instruction = instructionRaw.trim();
    if (instruction.length > FAMILY_PICTURE_FREE_TEXT_MAX_LENGTH) {
      return Response.json({ errorCode: "ERR_TEXT_TOO_LONG" }, { status: 400 });
    }

    const picture = await ctx.prisma.familyPicture.findFirst({
      where: { id: familyPictureId, treeId: ctx.params.treeId },
      select: {
        userId: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { s3Key: true },
        },
      },
    });

    if (!picture || picture.userId !== ctx.user.id) {
      return Response.json({ errorCode: "ERR_NOT_FOUND" }, { status: 404 });
    }

    const baseVersion = picture.versions[0];
    if (!baseVersion) {
      return Response.json({ errorCode: "ERR_NO_VERSION_TO_TWEAK" }, { status: 400 });
    }

    // Reserve the allowance slot before any paid work and before creating the
    // Generation row itself, so a user at their cap is hard-blocked
    // synchronously with no Generation ever created — same rule as initial
    // generation (issue 08).
    const reservationId = randomUUID();
    const reservation = await reserveGenerationAllowance(
      ctx.prisma,
      ctx.user.id,
      reservationId,
    );
    if (!reservation.ok) {
      return Response.json(
        { errorCode: "ERR_ALLOWANCE_EXHAUSTED", resetAt: reservation.resetAt.toISOString() },
        { status: 403 },
      );
    }

    let generation: { id: string };
    try {
      generation = await ctx.prisma.generation.create({
        data: {
          id: reservationId,
          userId: ctx.user.id,
          familyPictureId,
          status: "pending",
        },
      });
    } catch (error) {
      await refundGenerationAllowance(ctx.prisma, reservationId);
      throw error;
    }

    processFamilyPictureTweak({
      generationId: generation.id,
      familyPictureId,
      userId: ctx.user.id,
      baseImageKey: baseVersion.s3Key,
      instruction,
    }).catch((error) => {
      console.error("Family Picture tweak crashed", error);
    });

    return Response.json(
      { familyPictureId, generationId: generation.id },
      { status: 202 },
    );
  },
);
