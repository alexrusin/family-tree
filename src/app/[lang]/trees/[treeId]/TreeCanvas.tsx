// src/app/[lang]/trees/[treeId]/TreeCanvas.tsx
"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Panel,
  useReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  buildTreeGraph,
  type TreeFlowEdge,
  type TreeMemberData,
  type TreeRelationship,
} from "@/lib/tree-domain/tree-layout";
import { MemberNode } from "./MemberNode";
import { UnionNode } from "./UnionNode";
import { SpouseEdge } from "./SpouseEdge";
import { Plus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const nodeTypes: NodeTypes = { member: MemberNode, union: UnionNode };
const edgeTypes: EdgeTypes = { spouse: SpouseEdge };

interface TreeCanvasProps {
  members: TreeMemberData[];
  relationships: TreeRelationship[];
  canAddMember: boolean;
  onNodeClick: (memberId: string) => void;
  onEdgeClick: (event: React.MouseEvent, edge: TreeFlowEdge) => void;
  onAddMember: () => void;
  t: {
    emptyTitle: string;
    emptyBody: string;
    addFirstMember: string;
    fitToScreen: string;
    zoomIn: string;
    zoomOut: string;
    addMember: string;
    loading?: string;
  };
}

// Rendered inside <ReactFlow> — can use useReactFlow()
function CanvasToolbar({
  canAddMember,
  onAddMember,
  t,
}: {
  canAddMember: boolean;
  onAddMember: () => void;
  t: {
    fitToScreen: string;
    zoomIn: string;
    zoomOut: string;
    addMember: string;
  };
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  return (
    <Panel position="bottom-center">
      <div className="bg-white/90 backdrop-blur-md border border-stone-200 px-3 py-2 rounded-2xl shadow-xl shadow-amber-900/10 flex items-center gap-1">
        <button
          onClick={() => zoomIn()}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          title={t.zoomIn}
          aria-label={t.zoomIn}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          title={t.zoomOut}
          aria-label={t.zoomOut}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-stone-200 mx-1" />
        <button
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          title={t.fitToScreen}
          aria-label={t.fitToScreen}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {canAddMember && (
          <>
            <div className="w-px h-5 bg-stone-200 mx-1" />
            <button
              onClick={onAddMember}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title={t.addMember}
              aria-label={t.addMember}
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </Panel>
  );
}

export default function TreeCanvas({
  members,
  relationships,
  canAddMember,
  onNodeClick,
  onEdgeClick,
  onAddMember,
  t,
}: TreeCanvasProps) {
  const { nodes, edges } = useMemo(
    () => buildTreeGraph(members, relationships),
    [members, relationships],
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.type === "member") onNodeClick(node.id);
  };

  const handleEdgeClick: EdgeMouseHandler = (event, edge) => {
    onEdgeClick(event as React.MouseEvent, edge as TreeFlowEdge);
  };

  if (members.length === 0) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#fbf9f8]"
        style={{
          backgroundImage: "radial-gradient(#dcc1b6 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <p className="text-xl font-semibold text-stone-700">{t.emptyTitle}</p>
        <p className="text-stone-500 text-sm max-w-xs text-center">
          {t.emptyBody}
        </p>
        {canAddMember && (
          <button
            onClick={onAddMember}
            className="px-5 py-2.5 bg-amber-900 text-white rounded-lg font-semibold hover:bg-amber-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.addFirstMember}
          </button>
        )}
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      defaultEdgeOptions={{
        style: { stroke: "#44403C", strokeWidth: 2 },
      }}
      style={{
        backgroundImage: "radial-gradient(#dcc1b6 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        backgroundColor: "#fbf9f8",
      }}
    >
      <CanvasToolbar
        canAddMember={canAddMember}
        onAddMember={onAddMember}
        t={t}
      />
    </ReactFlow>
  );
}
