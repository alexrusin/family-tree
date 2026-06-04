/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  TreeMemberData,
  TreeRelationship,
} from "@/lib/tree-domain/tree-layout";
import PublicTreeViewClient from "./PublicTreeViewClient";

vi.mock("@/app/[lang]/trees/[treeId]/TreeCanvas", () => ({
  default: ({
    onNodeClick,
    arrangement,
  }: {
    onNodeClick: (id: string) => void;
    arrangement?: unknown;
  }) => (
    <div
      data-testid="tree-canvas"
      data-arrangement={JSON.stringify(arrangement ?? null)}
    >
      <button type="button" onClick={() => onNodeClick("member-1")}>
        Select member
      </button>
    </div>
  ),
}));

const members: TreeMemberData[] = [
  {
    id: "member-1",
    firstName: "Ada",
    lastName: "Lovelace",
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
    bio: "Mathematician and writer.",
    gender: "female",
  },
  {
    id: "member-2",
    firstName: "Charles",
    lastName: "Babbage",
    isLiving: false,
    birthYear: 1791,
    birthMonth: null,
    birthDay: null,
    birthPrecision: "year",
    deathYear: 1871,
    deathMonth: null,
    deathDay: null,
    deathPrecision: "year",
    photoUrl: null,
    bio: null,
    gender: "male",
  },
];

const relationships: TreeRelationship[] = [
  {
    id: "relationship-1",
    fromMemberId: "member-1",
    toMemberId: "member-2",
    type: "sibling",
  },
];

const translations = {
  canvas: {
    emptyTitle: "No members yet",
    emptyBody: "Add your first family member to begin building the tree.",
    addFirstMember: "Add First Member",
    fitToScreen: "Fit to screen",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    addMember: "Add member",
    loading: "Loading tree...",
  },
  panel: {
    close: "Close",
    born: "Born",
    died: "Died",
    gender: "Gender",
    about: "About",
    relationships: "Relationships",
    noRelationships: "No relationships yet.",
    parentOf: "Parent of",
    childOf: "Child of",
    spouseOf: "Spouse of",
    siblingOf: "Sibling of",
    editMember: "Edit Member",
    deleteMember: "Delete Member",
    deleteConfirmBody: "Delete this member?",
    deleteConfirm: "Delete",
    deleteCancel: "Cancel",
    deleting: "Deleting...",
    deleteFailed: "Unable to delete member.",
    remove: "Remove",
    removing: "Removing...",
    removeFailed: "Unable to remove relationship.",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    genderUndisclosed: "-",
  },
};

let currentViewportWidth = 0;
let mediaQueries: Array<{
  media: string;
  matches: boolean;
  onchange: ((event: MediaQueryListEvent) => void) | null;
  listeners: Set<(event: MediaQueryListEvent) => void>;
}> = [];

function queryMatchesViewport(query: string, viewportWidth: number) {
  const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
  if (minWidthMatch && viewportWidth < Number(minWidthMatch[1])) {
    return false;
  }

  const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
  if (maxWidthMatch && viewportWidth > Number(maxWidthMatch[1])) {
    return false;
  }

  return true;
}

function setViewportWidth(viewportWidth: number) {
  currentViewportWidth = viewportWidth;

  for (const mediaQuery of mediaQueries) {
    const nextMatches = queryMatchesViewport(mediaQuery.media, viewportWidth);
    if (mediaQuery.matches === nextMatches) {
      continue;
    }

    mediaQuery.matches = nextMatches;
    const event = {
      matches: nextMatches,
      media: mediaQuery.media,
    } as MediaQueryListEvent;
    mediaQuery.onchange?.(event);
    mediaQuery.listeners.forEach((listener) => listener(event));
  }
}

function mockMatchMedia(viewportWidth: number) {
  currentViewportWidth = viewportWidth;
  mediaQueries = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => {
      const mediaQuery = {
        media: query,
        matches: queryMatchesViewport(query, currentViewportWidth),
        onchange: null as ((event: MediaQueryListEvent) => void) | null,
        listeners: new Set<(event: MediaQueryListEvent) => void>(),
      };
      mediaQueries.push(mediaQuery);

      return {
        get matches() {
          return mediaQuery.matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: "change", listener: (event: MediaQueryListEvent) => void) => {
          mediaQuery.listeners.add(listener);
        },
        removeEventListener: (
          _: "change",
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          mediaQuery.listeners.delete(listener);
        },
        addListener: (listener: (event: MediaQueryListEvent) => void) => {
          mediaQuery.listeners.add(listener);
        },
        removeListener: (listener: (event: MediaQueryListEvent) => void) => {
          mediaQuery.listeners.delete(listener);
        },
        dispatchEvent: vi.fn(),
      };
    }),
  );
}

function renderSubject(viewportWidth: number) {
  mockMatchMedia(viewportWidth);

  render(
    <PublicTreeViewClient
      treeId="tree-1"
      treeName="Shared Tree"
      members={members}
      relationships={relationships}
      t={translations}
    />,
  );
}

describe("PublicTreeViewClient responsive member details", () => {
  beforeEach(() => {
    currentViewportWidth = 0;
    mediaQueries = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the tree badge and opens member details as tablet drawer then mobile overlay", async () => {
    const user = userEvent.setup();
    renderSubject(900);

    expect(screen.getByText("Shared Tree")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Select member" }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByTestId("member-panel-backdrop")).not.toBeNull();
    expect(screen.getByText("Close")).not.toBeNull();

    const [, closeControl] = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeControl);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    setViewportWidth(640);
    await user.click(screen.getByRole("button", { name: "Select member" }));
    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.queryByTestId("member-panel-backdrop")).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();
  });

  it("stays read-only for guest viewers in member details", async () => {
    const user = userEvent.setup();
    renderSubject(640);

    await user.click(screen.getByRole("button", { name: "Select member" }));
    expect(await screen.findByRole("dialog")).not.toBeNull();

    expect(
      screen.queryByRole("button", { name: translations.panel.editMember }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: translations.panel.deleteMember }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: translations.panel.remove }),
    ).toBeNull();
  });
});

describe("PublicTreeViewClient arrangement rendering", () => {
  beforeEach(() => {
    currentViewportWidth = 0;
    mediaQueries = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("passes a saved arrangement to TreeCanvas", () => {
    const savedArrangement = { "member-1": { x: 50, y: 80 } };
    mockMatchMedia(1280);

    render(
      <PublicTreeViewClient
        treeId="tree-1"
        treeName="Shared Tree"
        members={members}
        relationships={relationships}
        arrangement={savedArrangement}
        t={translations}
      />,
    );

    const canvas = screen.getByTestId("tree-canvas");
    const attr = canvas.getAttribute("data-arrangement");
    expect(JSON.parse(attr ?? "null")).toEqual(savedArrangement);
  });

  it("passes null to TreeCanvas when no arrangement is provided", () => {
    mockMatchMedia(1280);

    render(
      <PublicTreeViewClient
        treeId="tree-1"
        treeName="Shared Tree"
        members={members}
        relationships={relationships}
        t={translations}
      />,
    );

    const canvas = screen.getByTestId("tree-canvas");
    const attr = canvas.getAttribute("data-arrangement");
    expect(JSON.parse(attr ?? "undefined")).toBeNull();
  });
});
