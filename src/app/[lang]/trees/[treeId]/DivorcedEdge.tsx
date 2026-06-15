// src/app/[lang]/trees/[treeId]/DivorcedEdge.tsx
"use client";

import { memo } from "react";
import { getStraightPath, type EdgeProps, type Edge } from "@xyflow/react";

export type DivorcedEdgeType = Edge<{ relationshipId: string }, "divorced">;

export const DivorcedEdge = memo(function DivorcedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<DivorcedEdgeType>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <path
      id={id}
      d={edgePath}
      stroke="#44403C"
      strokeWidth={2}
      strokeDasharray="6,6"
      fill="none"
    />
  );
});
