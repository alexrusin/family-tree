// src/app/[lang]/trees/[treeId]/TreeCanvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Panel,
  useReactFlow,
  useNodesState,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type OnNodeDrag,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  buildTreeGraph,
  NODE_H,
  NODE_W,
  type MemberPosition,
  type TreeArrangement,
  type TreeFlowEdge,
  type TreeFlowNode,
  type TreeMemberData,
  type TreeRelationship,
} from "@/lib/tree-domain/tree-layout";
import { MemberNode } from "./MemberNode";
import { UnionNode } from "./UnionNode";
import { SpouseEdge } from "./SpouseEdge";
import { ParentEdge } from "./ParentEdge";
import { Plus, ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from "lucide-react";
import { resolveDragLockPreference, setStoredDragLockPreference } from "@/lib/tree-domain/drag-lock-preference";

const nodeTypes: NodeTypes = { member: MemberNode, union: UnionNode };
const edgeTypes: EdgeTypes = { spouse: SpouseEdge, parent: ParentEdge };

interface TreeCanvasProps {
  members: TreeMemberData[];
  relationships: TreeRelationship[];
  canAddMember: boolean;
  canEdit: boolean;
  arrangement?: TreeArrangement | null;
  onNodeClick: (memberId: string) => void;
  onEdgeClick: (event: React.MouseEvent, edge: TreeFlowEdge) => void;
  onAddMember: () => void;
  onDragStop?: (memberId: string, position: { x: number; y: number }) => void;
  /**
   * Registers a getter that returns the current viewport center in flow
   * coordinates (top-left of a node centered on the view), or `null` if it
   * cannot be measured. Called with `null` on unmount to deregister.
   */
  registerViewportCenter?: (
    getter: (() => MemberPosition | null) | null,
  ) => void;
  t: {
    emptyTitle: string;
    emptyBody: string;
    addFirstMember: string;
    fitToScreen: string;
    zoomIn: string;
    zoomOut: string;
    addMember: string;
    lockDragging: string;
    unlockDragging: string;
    loading?: string;
  };
}

// Rendered inside <ReactFlow> — can use useReactFlow()
function CanvasToolbar({
  canAddMember,
  onAddMember,
  canEdit,
  dragLocked,
  onToggleDragLock,
  t,
}: {
  canAddMember: boolean;
  onAddMember: () => void;
  canEdit: boolean;
  dragLocked: boolean;
  onToggleDragLock: () => void;
  t: {
    fitToScreen: string;
    zoomIn: string;
    zoomOut: string;
    addMember: string;
    lockDragging: string;
    unlockDragging: string;
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
        {canEdit && (
          <>
            <div className="w-px h-5 bg-stone-200 mx-1" />
            <button
              onClick={onToggleDragLock}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title={dragLocked ? t.unlockDragging : t.lockDragging}
              aria-label={dragLocked ? t.unlockDragging : t.lockDragging}
              aria-pressed={dragLocked}
            >
              {dragLocked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>
    </Panel>
  );
}

// Rendered inside <ReactFlow> so it can call useReactFlow(). Exposes a getter
// for the current viewport center (in flow coords) to the parent component.
function ViewportCenterReporter({
  containerRef,
  register,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  register: (getter: (() => MemberPosition | null) | null) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    register(() => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const center = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      // Convert from view center to the node's top-left so the node is centered.
      return { x: center.x - NODE_W / 2, y: center.y - NODE_H / 2 };
    });
    return () => register(null);
  }, [containerRef, register, screenToFlowPosition]);
  return null;
}

export default function TreeCanvas({
  members,
  relationships,
  canAddMember,
  canEdit,
  arrangement,
  onNodeClick,
  onEdgeClick,
  onAddMember,
  onDragStop,
  registerViewportCenter,
  t,
}: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag Lock is a personal, device-local preference (ADR 0003): resolve it
  // from localStorage, falling back to the pointer-capability default
  // (coarse/touch -> locked, fine/mouse -> unlocked). This component is only
  // ever rendered client-side (loaded with ssr: false), so window is
  // available on initial render.
  const [dragLocked, setDragLocked] = useState(() => {
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    return resolveDragLockPreference(window.localStorage, isCoarsePointer);
  });

  const handleToggleDragLock = () => {
    setDragLocked((prev) => {
      const next = !prev;
      setStoredDragLockPreference(window.localStorage, next);
      return next;
    });
  };

  const initialNodes = useMemo(
    () => buildTreeGraph(members, relationships, arrangement).nodes,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const edges = useMemo(
    () => buildTreeGraph(members, relationships, arrangement).edges,
    [members, relationships, arrangement],
  );

  // Sync nodes from parent state (handles initial load, member additions/removals, and position reverts).
  useEffect(() => {
    const { nodes: computedNodes } = buildTreeGraph(
      members,
      relationships,
      arrangement,
    );
    setNodes(computedNodes);
  }, [members, relationships, arrangement, setNodes]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.type === "member") onNodeClick(node.id);
  };

  const handleEdgeClick: EdgeMouseHandler = (event, edge) => {
    onEdgeClick(event as React.MouseEvent, edge as TreeFlowEdge);
  };

  const handleNodeDragStop: OnNodeDrag<TreeFlowNode> = (_event, node) => {
    if (node.type === "member") {
      onDragStop?.(node.id, node.position);
    }
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
    <div ref={containerRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={canEdit && !dragLocked}
        nodesConnectable={false}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStop={handleNodeDragStop}
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
          canEdit={canEdit}
          dragLocked={dragLocked}
          onToggleDragLock={handleToggleDragLock}
          t={t}
        />
        {registerViewportCenter && (
          <ViewportCenterReporter
            containerRef={containerRef}
            register={registerViewportCenter}
          />
        )}
      </ReactFlow>
    </div>
  );
}
