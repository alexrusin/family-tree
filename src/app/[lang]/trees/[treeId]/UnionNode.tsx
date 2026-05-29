// src/app/[lang]/trees/[treeId]/UnionNode.tsx
"use client";

import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import type { UnionNodeData } from "@/lib/tree-domain/tree-layout";

export type UnionNodeType = Node<UnionNodeData, "union">;

export const UnionNode = memo(function UnionNode() {
  return (
    <div
      style={{ width: 8, height: 8 }}
      className="rounded-full bg-stone-400 opacity-60"
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});
