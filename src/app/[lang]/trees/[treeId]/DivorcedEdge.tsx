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
    <g>
      {/* Transparent wide hit area — makes the dashed line easy to click */}
      <path id={id} d={edgePath} stroke="transparent" strokeWidth={20} fill="none" />
      {/* Visible dashed line */}
      <path
        d={edgePath}
        stroke="#44403C"
        strokeWidth={2}
        strokeDasharray="6,6"
        fill="none"
        pointerEvents="none"
      />
    </g>
  );
});
