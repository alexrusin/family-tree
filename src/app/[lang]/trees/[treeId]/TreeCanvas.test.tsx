/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  DRAG_LOCK_STORAGE_KEY,
  setStoredDragLockPreference,
} from "@/lib/tree-domain/drag-lock-preference";
import TreeCanvas from "./TreeCanvas";
import type { TreeMemberData, TreeRelationship } from "@/lib/tree-domain/tree-layout";

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Panel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useReactFlow: () => ({
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    screenToFlowPosition: () => ({ x: 0, y: 0 }),
  }),
  useNodesState: (initial: unknown) => [initial, vi.fn(), vi.fn()],
  Handle: () => null,
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
  BaseEdge: () => null,
  getBezierPath: () => ["", 0, 0],
  getStraightPath: () => ["", 0, 0],
}));

vi.mock("@xyflow/react/dist/style.css", () => ({}));

const t = {
  emptyTitle: "Empty",
  emptyBody: "Empty body",
  addFirstMember: "Add first member",
  fitToScreen: "Fit to screen",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  addMember: "Add member",
  lockDragging: "Lock dragging",
  unlockDragging: "Unlock dragging",
};

const members: TreeMemberData[] = [
  {
    id: "m1",
    firstName: "Ada",
    lastName: "Lovelace",
    maidenName: null,
    isLiving: false,
    birthYear: 1815,
    birthMonth: null,
    birthDay: null,
    birthPrecision: "year",
    deathYear: 1852,
    deathMonth: null,
    deathDay: null,
    deathPrecision: "year",
    photoUrl: null,
    bio: null,
    gender: "female",
  },
];
const relationships: TreeRelationship[] = [];

function renderCanvas(props: Partial<React.ComponentProps<typeof TreeCanvas>> = {}) {
  return render(
    <TreeCanvas
      members={members}
      relationships={relationships}
      canAddMember={true}
      canEdit={true}
      onNodeClick={() => {}}
      onEdgeClick={() => {}}
      onAddMember={() => {}}
      t={t}
      {...props}
    />,
  );
}

describe("TreeCanvas Drag Lock on member added", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    cleanup();
  });

  it("unlocks and persists when a Member is added while locked", () => {
    setStoredDragLockPreference(window.localStorage, true);

    const { rerender } = renderCanvas({ memberAddedSignal: 0 });

    const toggle = screen.getByRole("button", { name: t.unlockDragging });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    rerender(
      <TreeCanvas
        members={members}
        relationships={relationships}
        canAddMember={true}
        canEdit={true}
        onNodeClick={() => {}}
        onEdgeClick={() => {}}
        onAddMember={() => {}}
        memberAddedSignal={1}
        t={t}
      />,
    );

    const unlockedToggle = screen.getByRole("button", { name: t.lockDragging });
    expect(unlockedToggle.getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem(DRAG_LOCK_STORAGE_KEY)).toBe("false");
  });

  it("does not change the lock state on initial render", () => {
    setStoredDragLockPreference(window.localStorage, true);

    renderCanvas({ memberAddedSignal: 5 });

    const toggle = screen.getByRole("button", { name: t.unlockDragging });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem(DRAG_LOCK_STORAGE_KEY)).toBe("true");
  });

  it("does not re-lock after a subsequent member-added signal stays the same", () => {
    setStoredDragLockPreference(window.localStorage, true);

    const { rerender } = renderCanvas({ memberAddedSignal: 0 });

    rerender(
      <TreeCanvas
        members={members}
        relationships={relationships}
        canAddMember={true}
        canEdit={true}
        onNodeClick={() => {}}
        onEdgeClick={() => {}}
        onAddMember={() => {}}
        memberAddedSignal={1}
        t={t}
      />,
    );

    // Editor manually re-locks after the add.
    fireEvent.click(screen.getByRole("button", { name: t.lockDragging }));
    expect(window.localStorage.getItem(DRAG_LOCK_STORAGE_KEY)).toBe("true");

    // Re-rendering with the same signal must not force another unlock.
    rerender(
      <TreeCanvas
        members={members}
        relationships={relationships}
        canAddMember={true}
        canEdit={true}
        onNodeClick={() => {}}
        onEdgeClick={() => {}}
        onAddMember={() => {}}
        memberAddedSignal={1}
        t={t}
      />,
    );

    expect(window.localStorage.getItem(DRAG_LOCK_STORAGE_KEY)).toBe("true");
  });
});
