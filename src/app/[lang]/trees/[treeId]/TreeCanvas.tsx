// src/app/[lang]/trees/[treeId]/TreeCanvas.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Panel,
  useReactFlow,
  useNodesState,
  applyNodeChanges,
  SelectionMode,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesChange,
  type SelectionDragHandler,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  NODE_H,
  NODE_W,
  syncUnionPositions,
  type MemberPosition,
  type TreeArrangement,
  type TreeFlowEdge,
  type TreeFlowNode,
  type TreeMemberData,
  type TreeRelationship,
} from "@/lib/tree-domain/tree-layout";
import { buildVisibleGraph } from "@/lib/tree-domain/visible-graph";
import { MemberNode } from "./MemberNode";
import { UnionNode } from "./UnionNode";
import { SpouseEdge } from "./SpouseEdge";
import { DivorcedEdge } from "./DivorcedEdge";
import { ParentEdge } from "./ParentEdge";
import { Plus, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Sparkles } from "lucide-react";
import { resolveDragLockPreference, setStoredDragLockPreference } from "@/lib/tree-domain/drag-lock-preference";

const nodeTypes: NodeTypes = { member: MemberNode, union: UnionNode };
const edgeTypes: EdgeTypes = {
  spouse: SpouseEdge,
  divorced: DivorcedEdge,
  parent: ParentEdge,
};

interface TreeCanvasProps {
  members: TreeMemberData[];
  relationships: TreeRelationship[];
  canAddMember: boolean;
  canEdit: boolean;
  arrangement?: TreeArrangement | null;
  onNodeClick: (memberId: string) => void;
  onEdgeClick: (event: React.MouseEvent, edge: TreeFlowEdge) => void;
  onAddMember: () => void;
  onResetLayout?: () => void;
  /**
   * Incremented by the parent after a layout reset clears the arrangement, so
   * the canvas re-frames the freshly auto-laid-out tree. Ignored on mount.
   */
  fitViewSignal?: number;
  onDragStop?: (memberId: string, position: { x: number; y: number }) => void;
  onSelectionDragStop?: (
    positions: Array<{ memberId: string; position: { x: number; y: number } }>,
  ) => void;
  onSelectionChange?: (selectedNodeIds: string[]) => void;
  /**
   * Incremented by the parent each time a new Member is added to the tree.
   * Adding a Member forces the Drag Lock to unlocked (ADR 0003), so a change
   * to this value (after the initial mount) unlocks dragging and persists
   * the preference, regardless of its prior state.
   */
  memberAddedSignal?: number;
  /**
   * Registers a getter that returns the current viewport center in flow
   * coordinates (top-left of a node centered on the view), or `null` if it
   * cannot be measured. Called with `null` on unmount to deregister.
   */
  registerViewportCenter?: (
    getter: (() => MemberPosition | null) | null,
  ) => void;
  hiddenIds?: Set<string>;
  collapsedAnchors?: string[];
  onBadgeClick?: (memberId: string) => void;
  badgeLabelTemplate?: string;
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
    resetLayout?: string;
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
  onResetLayout,
  t,
}: {
  canAddMember: boolean;
  onAddMember: () => void;
  canEdit: boolean;
  dragLocked: boolean;
  onToggleDragLock: () => void;
  onResetLayout?: () => void;
  t: {
    fitToScreen: string;
    zoomIn: string;
    zoomOut: string;
    addMember: string;
    lockDragging: string;
    unlockDragging: string;
    resetLayout?: string;
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
            {onResetLayout && (
              <button
                onClick={onResetLayout}
                className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                title={t.resetLayout}
                aria-label={t.resetLayout}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
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

// Rendered inside <ReactFlow> so it can call useReactFlow(). Re-fits the view
// whenever `signal` changes (after the initial mount), used to frame the tree
// after a layout reset re-lays the nodes out.
function FitViewOnSignal({ signal }: { signal: number | undefined }) {
  const { fitView } = useReactFlow();
  const lastSignal = useRef(signal);
  useEffect(() => {
    if (signal === undefined) return;
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;
    void fitView({ padding: 0.2, duration: 400 });
  }, [signal, fitView]);
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
  onResetLayout,
  fitViewSignal,
  onDragStop,
  onSelectionDragStop,
  onSelectionChange,
  memberAddedSignal,
  registerViewportCenter,
  hiddenIds,
  collapsedAnchors,
  onBadgeClick,
  badgeLabelTemplate,
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

  // Adding a Member forces the Drag Lock to unlocked, regardless of its prior
  // state, so the new node can be positioned immediately (ADR 0003). There is
  // no automatic re-lock afterward. Skip the initial mount, since the signal
  // hasn't changed yet at that point.
  const lastMemberAddedSignal = useRef(memberAddedSignal);
  useEffect(() => {
    if (memberAddedSignal === undefined) return;
    if (memberAddedSignal === lastMemberAddedSignal.current) return;
    lastMemberAddedSignal.current = memberAddedSignal;
    setDragLocked(false);
    setStoredDragLockPreference(window.localStorage, false);
  }, [memberAddedSignal]);

  const emptySet = useMemo(() => new Set<string>(), []);
  const emptyAnchors = useMemo(() => [] as string[], []);
  const effectiveHiddenIds = hiddenIds ?? emptySet;
  const effectiveAnchors = collapsedAnchors ?? emptyAnchors;

  function applyBadgeData(
    nodes: TreeFlowNode[],
    hiddenCounts: Map<string, number>,
  ): TreeFlowNode[] {
    if (hiddenCounts.size === 0) return nodes;
    return nodes.map((n) => {
      if (n.type !== "member") return n;
      const count = hiddenCounts.get(n.id);
      if (!count) return n;
      return {
        ...n,
        data: {
          ...n.data,
          hiddenCount: count,
          onBadgeClick,
          badgeLabel: badgeLabelTemplate?.replace("{count}", String(count)),
        },
      };
    });
  }

  const initialNodes = useMemo(() => {
    const { nodes, hiddenCounts } = buildVisibleGraph(
      members,
      relationships,
      effectiveHiddenIds,
      arrangement,
      effectiveAnchors,
    );
    return applyBadgeData(nodes, hiddenCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes] = useNodesState(initialNodes);

  // Apply React Flow's node changes, then re-pin union nodes to their parents.
  // React Flow only moves the nodes a user drags, so without this the derived
  // union nodes stay put during a drag and snap into place on drop. Re-syncing
  // on every change keeps them glued to the members as they move.
  const handleNodesChange = useCallback<OnNodesChange<TreeFlowNode>>(
    (changes) => {
      setNodes((current) => syncUnionPositions(applyNodeChanges(changes, current)));
    },
    [setNodes],
  );

  const edges = useMemo(
    () =>
      buildVisibleGraph(
        members,
        relationships,
        effectiveHiddenIds,
        arrangement,
        effectiveAnchors,
      ).edges,
    [members, relationships, effectiveHiddenIds, arrangement, effectiveAnchors],
  );

  // Sync nodes from parent state (handles initial load, member additions/removals, and position reverts).
  useEffect(() => {
    const { nodes: computedNodes, hiddenCounts } = buildVisibleGraph(
      members,
      relationships,
      effectiveHiddenIds,
      arrangement,
      effectiveAnchors,
    );
    setNodes(applyBadgeData(computedNodes, hiddenCounts));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, relationships, effectiveHiddenIds, arrangement, effectiveAnchors, setNodes, onBadgeClick, badgeLabelTemplate]);

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

  const handleSelectionDragStop: SelectionDragHandler<TreeFlowNode> = (
    _event,
    draggedNodes,
  ) => {
    const memberPositions = draggedNodes
      .filter((n) => n.type === "member")
      .map((n) => ({ memberId: n.id, position: n.position }));
    if (memberPositions.length > 0) {
      onSelectionDragStop?.(memberPositions);
    }
  };

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: TreeFlowNode[] }) => {
      const memberIds = selectedNodes
        .filter((n) => n.type === "member")
        .map((n) => n.id);
      onSelectionChange?.(memberIds);
    },
    [onSelectionChange],
  );

  const selectionEnabled = canEdit && !dragLocked;
  const isCoarsePointer = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    [],
  );

  // Escape clears an active multi-selection (US #13). React Flow does not bind
  // Escape by default, so unselect every node ourselves while selection is
  // enabled. Clearing the `selected` flag fires onSelectionChange, which resets
  // the parent's multi-select count and restores the Member Details Panel.
  useEffect(() => {
    if (!selectionEnabled || isCoarsePointer) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNodes((current) =>
        current.some((n) => n.selected)
          ? current.map((n) => (n.selected ? { ...n, selected: false } : n))
          : current,
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectionEnabled, isCoarsePointer, setNodes]);

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
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleSelectionDragStop}
        onSelectionChange={handleSelectionChange}
        // Plain left-drag always pans. Rubber-band selection is bound to the
        // Shift key (gated to editors on a fine pointer with the Drag Lock
        // off), so Shift+drag selects without also panning. selectionOnDrag is
        // intentionally left off: enabling it alongside panOnDrag makes a
        // single left-drag both pan and draw a selection box.
        selectionOnDrag={false}
        panOnDrag
        selectionMode={SelectionMode.Partial}
        selectionKeyCode={selectionEnabled && !isCoarsePointer ? "Shift" : null}
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
          onResetLayout={onResetLayout}
          t={t}
        />
        <FitViewOnSignal signal={fitViewSignal} />
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
