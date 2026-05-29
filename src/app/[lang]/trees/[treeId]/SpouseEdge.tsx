// src/app/[lang]/trees/[treeId]/SpouseEdge.tsx
"use client";

import { memo } from "react";
import { getStraightPath, type EdgeProps, type Edge } from "@xyflow/react";

export type SpouseEdgeType = Edge<{ relationshipId: string }, "spouse">;

export const SpouseEdge = memo(function SpouseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps<SpouseEdgeType>) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <g>
      {/* Outer thick line */}
      <path id={id} d={edgePath} stroke="#44403C" strokeWidth={6} fill="none" />
      {/* Inner white line — creates double-line effect */}
      <path
        d={edgePath}
        stroke="#fbf9f8"
        strokeWidth={2}
        fill="none"
        pointerEvents="none"
      />
    </g>
  );
});
