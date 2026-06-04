import type { Prisma } from "@/generated/prisma/client";

import type { TreeArrangement } from "./tree-layout";

export function toPrismaNodePositions(
  arrangement: TreeArrangement,
): Prisma.InputJsonObject {
  const nodePositions: Record<string, Prisma.InputJsonValue> = {};

  for (const [memberId, position] of Object.entries(arrangement)) {
    nodePositions[memberId] = {
      x: position.x,
      y: position.y,
    } satisfies Prisma.InputJsonObject;
  }

  return nodePositions;
}
