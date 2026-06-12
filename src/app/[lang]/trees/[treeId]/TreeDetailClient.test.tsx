/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import TreeDetailClient from "./TreeDetailClient";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({
      onNodeClick,
      onDragStop,
      canEdit,
      arrangement,
      members,
      relationships,
    }: {
      onNodeClick: (id: string) => void;
      onDragStop?: (memberId: string, position: { x: number; y: number }) => void;
      canEdit?: boolean;
      arrangement?: unknown;
      members?: Array<{ id: string }>;
      relationships?: Array<{ id: string }>;
    }) => (
      <div
        data-testid="tree-canvas"
        data-arrangement={JSON.stringify(arrangement ?? null)}
        data-can-edit={String(canEdit ?? false)}
        data-member-count={String(members?.length ?? 0)}
        data-relationship-count={String(relationships?.length ?? 0)}
      >
        <button type="button" onClick={() => onNodeClick("member-1")}>
          Select member
        </button>
        {canEdit && onDragStop && (
          <button
            type="button"
            onClick={() => onDragStop("member-1", { x: 50, y: 100 })}
          >
            Drag member
          </button>
        )}
      </div>
    ),
}));

vi.mock("./AddMemberModal", () => ({
  default: ({
    isOpen,
    onMemberCreated,
  }: {
    isOpen: boolean;
    onMemberCreated: (member: {
      id: string;
      firstName: string;
      lastName: string | null;
      isLiving: boolean;
      birthYear: number | null;
      birthMonth: number | null;
      birthDay: number | null;
      birthPrecision: string | null;
      deathYear: number | null;
      deathMonth: number | null;
      deathDay: number | null;
      deathPrecision: string | null;
      photoUrl: string | null;
      bio: string | null;
      gender: string;
    }) => void;
  }) =>
    isOpen ? (
      <div data-testid="add-member-modal">
        <button
          type="button"
          onClick={() =>
            onMemberCreated({
              id: "member-2",
              firstName: "Member2",
              lastName: null,
              isLiving: true,
              birthYear: null,
              birthMonth: null,
              birthDay: null,
              birthPrecision: null,
              deathYear: null,
              deathMonth: null,
              deathDay: null,
              deathPrecision: null,
              photoUrl: null,
              bio: null,
              gender: "undisclosed",
            })
          }
        >
          Complete add member
        </button>
      </div>
    ) : null,
}));
vi.mock("./AddRelationshipModal", () => ({
  default: ({
    isOpen,
    onRelationshipCreated,
  }: {
    isOpen: boolean;
    onRelationshipCreated: (relationship: {
      id: string;
      fromMemberId: string;
      toMemberId: string;
      type: "parent" | "spouse" | "sibling";
    }) => void;
  }) =>
    isOpen ? (
      <div data-testid="add-relationship-modal">
        <button
          type="button"
          onClick={() =>
            onRelationshipCreated({
              id: "relationship-1",
              fromMemberId: "member-1",
              toMemberId: "member-2",
              type: "spouse",
            })
          }
        >
          Complete add relationship
        </button>
      </div>
    ) : null,
}));
vi.mock("./EditMemberModal", () => ({ default: () => null }));
vi.mock("./ShareLinkSettingsModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="share-link-settings-modal" /> : null,
}));
vi.mock("./MemberSidePanel", () => ({
  default: ({
    member,
    onClose,
    onDeleted,
    onRelationshipRemoved,
    allRelationships,
    presentation = "desktop",
    t,
  }: {
    member: { id: string };
    onClose: () => void;
    onDeleted: (memberId: string) => void;
    onRelationshipRemoved: (relationshipId: string) => void;
    allRelationships: Array<{ id: string }>;
    presentation?: "desktop" | "tablet" | "mobile";
    t: { close: string };
  }) => (
    <aside
      data-testid="member-side-panel"
      data-member-id={member.id}
      data-presentation={presentation}
      data-relationship-count={String(allRelationships.length)}
    >
      <button type="button" onClick={onClose}>
        {t.close}
      </button>
      <button type="button" onClick={() => onDeleted(member.id)}>
        Delete selected member
      </button>
      <button
        type="button"
        onClick={() => onRelationshipRemoved("relationship-1")}
      >
        Remove selected relationship
      </button>
    </aside>
  ),
}));
vi.mock("./RelationshipEdgePopover", () => ({ default: () => null }));

const translations = {
  addMember: "Add Member",
  addRelationship: "Add Relationship",
  viewOnly: "View-only access",
  cancel: "Cancel",
  saving: "Saving...",
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
    removeFailed: "Unable to remove relationship.",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    genderUndisclosed: "—",
  },
  sidebar: {
    warningBanner: "Approaching the 300-member limit ({count}/300).",
    limitReached: "300-member limit reached. No more members can be added.",
    memberCount: "{count} members",
    resetLayout: "Reset Layout",
  },
  treeMenu: {
    trigger: "Tree Menu",
    close: "Close Tree Menu",
    dialogLabel: "Tree Menu",
  },
  collaboration: {
    sidebarLink: "Collaborators",
  },
  publicShare: {
    sidebarAction: "Share Link",
    modalTitle: "Share link settings",
    enable: "Enable public link",
    description: "Anyone with the link can view this tree in read-only mode.",
    copy: "Copy",
    copySuccess: "Link copied.",
    regenerate: "Regenerate link",
    regenerateConfirm: "Regenerate link?",
  },
  member: {
    addTitle: "Add Member",
    addSubtitle: "Add a person to this family tree.",
    editTitle: "Edit Member",
    editSubtitle: "Update this person's information.",
    firstName: "First Name",
    firstNamePlaceholder: "e.g., Elena",
    lastName: "Last Name",
    lastNamePlaceholder: "Optional",
    gender: "Gender",
    genderUndisclosed: "Not disclosed",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    bio: "Bio",
    bioPlaceholder: "Optional biography",
    birthSection: "Date of Birth",
    deathSection: "Date of Death",
    precision: "Precision",
    precisionYear: "Year only",
    precisionMonth: "Month & Year",
    precisionDay: "Full date",
    yearLabel: "Year",
    monthLabel: "Month",
    dayLabel: "Day",
    profilePhoto: "Profile Photo",
    isLiving: "Living member",
    update: "Save Changes",
    closeModal: "Close modal",
    currentPhotoAlt: "Current photo",
    addPhoto: "Add Photo",
    updatePhoto: "Update Photo",
  },
  relationship: {
    addTitle: "Add Relationship",
    addSubtitle: "Connect two members in this tree.",
    memberA: "Member A",
    memberB: "Member B",
    type: "Relationship Type",
    selectMember: "Select member",
    parent: "Parent",
    child: "Child",
    spouse: "Spouse",
    sibling: "Sibling",
    searchMembers: "Search members",
    noMembersFound: "No members found.",
    needTwoMembers: "At least two members are required to create a relationship.",
    closeModal: "Close modal",
    remove: "Remove",
    removing: "Removing...",
    removeFailed: "Unable to remove relationship.",
  },
  errors: {
    ERR_FIRST_NAME_REQUIRED: "First name is required",
    ERR_MEMBER_LIMIT_REACHED: "Member limit reached",
    ERR_IMAGE_TOO_LARGE: "Image too large",
    ERR_UNSUPPORTED_IMAGE_TYPE: "Unsupported image type",
    ERR_DUPLICATE_RELATIONSHIP: "Relationship exists",
    ERR_SELF_RELATIONSHIP: "Self relationship",
    ERR_FORBIDDEN: "Forbidden",
    ERR_INVALID_RELATIONSHIP: "Invalid relationship",
    ERR_DEATH_BEFORE_BIRTH: "Death before birth",
    ERR_INVALID_PARTIAL_DATE: "Invalid date",
    memberGeneric: "Unable to add member.",
    relationshipGeneric: "Unable to add relationship.",
    loadFailed: "Unable to load members and relationships.",
    chooseTwoMembers: "Choose two members.",
    chooseDifferentMembers: "Choose different members.",
    dragSaveFailed: "Unable to save member position.",
    resetLayoutFailed: "Unable to reset layout.",
  },
};

let mockedFetchedMemberCount = 0;
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

function renderSubject({
  viewportWidth,
  canEdit = true,
  isOwner = false,
  initialMemberCount = 4,
  fetchedMemberCount = initialMemberCount,
}: {
  viewportWidth: number;
  canEdit?: boolean;
  isOwner?: boolean;
  initialMemberCount?: number;
  fetchedMemberCount?: number;
}) {
  mockMatchMedia(viewportWidth);
  mockedFetchedMemberCount = fetchedMemberCount;

  render(
    <TreeDetailClient
      lang="en"
      treeId="tree-1"
      treeName="Family Tree"
      canEdit={canEdit}
      isOwner={isOwner}
      initialMemberCount={initialMemberCount}
      t={translations}
    />,
  );
}

describe("TreeDetailClient responsive tree workspace shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchedMemberCount = 0;
    currentViewportWidth = 0;
    mediaQueries = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/members")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              members: Array.from({ length: mockedFetchedMemberCount }, (_, i) => ({
                id: `member-${i + 1}`,
                firstName: `Member${i + 1}`,
              })),
            }),
          });
        }

        if (url.includes("/relationships")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ relationships: [] }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the permanent tree menu layout on desktop viewports", () => {
    renderSubject({ viewportWidth: 1280 });

    expect(screen.getByText("Family Tree")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Tree Menu" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
  });

  it("starts closed and opens the capped-width drawer from the mobile trigger", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 640 });

    const trigger = screen.getByRole("button", { name: "Tree Menu" });
    expect(trigger.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();

    await user.click(trigger);

    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();
    expect(screen.getByTestId("tree-menu-drawer").className).toContain(
      "max-w-xs",
    );

    await user.click(screen.getByTestId("tree-menu-close-control"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
  });

  it("dismisses the mobile drawer via backdrop click and Escape", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 640 });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(screen.getByTestId("tree-menu-backdrop"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
  });

  it("keeps owner editor parity actions and warning state in the mobile tree menu", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 640,
      canEdit: true,
      isOwner: true,
      initialMemberCount: 250,
    });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    expect(screen.getByText("250 members")).not.toBeNull();
    expect(
      screen.getByText("Approaching the 300-member limit (250/300)."),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Collaborators" }),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Share Link" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add Member" })).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Add Relationship" }),
    ).not.toBeNull();
    expect(screen.queryByText("View-only access")).toBeNull();
  });

  it("shows a read-only collaborator viewer state in the mobile tree menu", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 640,
      canEdit: false,
      isOwner: false,
      initialMemberCount: 300,
    });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    expect(screen.getByText("300 members")).not.toBeNull();
    expect(
      screen.getByText("300-member limit reached. No more members can be added."),
    ).not.toBeNull();
    expect(
      screen.getByRole("link", { name: "Collaborators" }),
    ).not.toBeNull();
    expect(screen.getByText("View-only access")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Share Link" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Member" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Relationship" })).toBeNull();
  });

  it("closes the mobile tree menu before opening add-member and add-relationship flows", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 640, canEdit: true, isOwner: false });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Add Member" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
    expect(screen.getByTestId("add-member-modal")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Add Relationship" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
    expect(screen.getByTestId("add-relationship-modal")).not.toBeNull();
  });

  it("closes the mobile tree menu before navigating to collaborators", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 640, canEdit: true, isOwner: false });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(screen.getByRole("link", { name: "Collaborators" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
  });

  it("closes the mobile tree menu before opening share link settings", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 640, canEdit: true, isOwner: true });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Share Link" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });
    expect(screen.getByTestId("share-link-settings-modal")).not.toBeNull();
  });

  it("opens member details as a tablet drawer and a phone overlay", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 900, fetchedMemberCount: 1 });

    await user.click(await screen.findByRole("button", { name: "Select member" }));

    const tabletPanel = await screen.findByTestId("member-side-panel");
    expect(tabletPanel.getAttribute("data-presentation")).toBe("tablet");
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByTestId("member-side-panel")).toBeNull();
    });

    setViewportWidth(640);
    await user.click(await screen.findByRole("button", { name: "Select member" }));

    const mobilePanel = await screen.findByTestId("member-side-panel");
    expect(mobilePanel.getAttribute("data-presentation")).toBe("mobile");
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();
  });

  it("dismisses the tree menu before opening member details below lg", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 900, fetchedMemberCount: 1 });

    await user.click(screen.getByRole("button", { name: "Tree Menu" }));
    expect(await screen.findByRole("dialog", { name: "Tree Menu" })).not.toBeNull();

    await user.click(await screen.findByRole("button", { name: "Select member" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Tree Menu" })).toBeNull();
    });

    const panel = await screen.findByTestId("member-side-panel");
    expect(panel.getAttribute("data-presentation")).toBe("tablet");
  });

  it("adapts the member details panel cleanly across breakpoint changes", async () => {
    const user = userEvent.setup();
    renderSubject({ viewportWidth: 900, fetchedMemberCount: 1 });

    await user.click(await screen.findByRole("button", { name: "Select member" }));

    const panel = await screen.findByTestId("member-side-panel");
    expect(panel.getAttribute("data-presentation")).toBe("tablet");

    setViewportWidth(640);
    await waitFor(() => {
      expect(screen.getByTestId("member-side-panel").getAttribute("data-presentation")).toBe(
        "mobile",
      );
    });

    setViewportWidth(1280);
    await waitFor(() => {
      expect(screen.getByTestId("member-side-panel").getAttribute("data-presentation")).toBe(
        "desktop",
      );
    });
    expect(screen.queryByRole("button", { name: "Tree Menu" })).toBeNull();
  });

  it("adds a member locally without reloading the tree data", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 1280,
      initialMemberCount: 1,
      fetchedMemberCount: 1,
    });

    const fetchMock = vi.mocked(fetch);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    expect(screen.getByText("1 members")).not.toBeNull();
    expect(screen.getByTestId("tree-canvas").getAttribute("data-member-count")).toBe(
      "1",
    );

    await user.click(screen.getByRole("button", { name: "Add Member" }));
    await user.click(screen.getByRole("button", { name: "Complete add member" }));

    await waitFor(() => {
      expect(screen.getByText("2 members")).not.toBeNull();
      expect(
        screen.getByTestId("tree-canvas").getAttribute("data-member-count"),
      ).toBe("2");
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("adds a relationship locally without reloading the tree data", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 1280,
      initialMemberCount: 2,
      fetchedMemberCount: 2,
    });

    const fetchMock = vi.mocked(fetch);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    expect(
      screen.getByTestId("tree-canvas").getAttribute("data-relationship-count"),
    ).toBe("0");

    await user.click(screen.getByRole("button", { name: "Add Relationship" }));
    await user.click(
      screen.getByRole("button", { name: "Complete add relationship" }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("tree-canvas").getAttribute("data-relationship-count"),
      ).toBe("1");
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("deletes a member locally without reloading the tree data", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 1280,
      initialMemberCount: 1,
      fetchedMemberCount: 1,
    });

    const fetchMock = vi.mocked(fetch);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await user.click(await screen.findByRole("button", { name: "Select member" }));
    await user.click(screen.getByRole("button", { name: "Delete selected member" }));

    await waitFor(() => {
      expect(screen.queryByTestId("member-side-panel")).toBeNull();
      expect(screen.getByText("0 members")).not.toBeNull();
      expect(
        screen.getByTestId("tree-canvas").getAttribute("data-member-count"),
      ).toBe("0");
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("deletes a relationship locally without reloading the tree data", async () => {
    const user = userEvent.setup();
    renderSubject({
      viewportWidth: 1280,
      initialMemberCount: 2,
      fetchedMemberCount: 2,
    });

    const fetchMock = vi.mocked(fetch);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await user.click(screen.getByRole("button", { name: "Add Relationship" }));
    await user.click(
      screen.getByRole("button", { name: "Complete add relationship" }),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("tree-canvas").getAttribute("data-relationship-count"),
      ).toBe("1");
    });

    await user.click(await screen.findByRole("button", { name: "Select member" }));
    await user.click(
      screen.getByRole("button", { name: "Remove selected relationship" }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("tree-canvas").getAttribute("data-relationship-count"),
      ).toBe("0");
      expect(
        screen.getByTestId("member-side-panel").getAttribute("data-relationship-count"),
      ).toBe("0");
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("TreeDetailClient manual arrangement rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentViewportWidth = 0;
    mediaQueries = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("passes arrangement to TreeCanvas when the arrangement endpoint returns data", async () => {
    const savedArrangement = { "member-1": { x: 100, y: 200 } };
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ members: [] }),
          });
        if (url.includes("/relationships"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ relationships: [] }),
          });
        if (url.includes("/arrangement"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ arrangement: savedArrangement }),
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={true}
        isOwner={false}
        initialMemberCount={0}
        t={translations}
      />,
    );

    await waitFor(() => {
      const canvas = screen.getByTestId("tree-canvas");
      const attr = canvas.getAttribute("data-arrangement");
      expect(JSON.parse(attr ?? "null")).toEqual(savedArrangement);
    });
  });

  it("passes null arrangement to TreeCanvas when the arrangement endpoint returns null", async () => {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ members: [] }),
          });
        if (url.includes("/relationships"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ relationships: [] }),
          });
        if (url.includes("/arrangement"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ arrangement: null }),
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={false}
        isOwner={false}
        initialMemberCount={0}
        t={translations}
      />,
    );

    await waitFor(() => {
      const canvas = screen.getByTestId("tree-canvas");
      const attr = canvas.getAttribute("data-arrangement");
      expect(JSON.parse(attr ?? "undefined")).toBeNull();
    });
  });
});

describe("TreeDetailClient drag-and-save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentViewportWidth = 0;
    mediaQueries = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function setupFetchWithArrangementHandler(
    arrangementHandler: (body: { arrangement?: unknown }) => Response | Promise<Response>,
  ) {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({
            ok: true,
            json: async () => ({
              members: [{ id: "member-1", firstName: "Alice" }],
            }),
          });
        if (url.includes("/relationships"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ relationships: [] }),
          });
        if (url.includes("/arrangement") && init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as { arrangement?: unknown };
          return Promise.resolve(arrangementHandler(body));
        }
        if (url.includes("/arrangement"))
          return Promise.resolve({
            ok: true,
            json: async () => ({ arrangement: null }),
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );
  }

  it("passes canEdit to the canvas", async () => {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({ ok: true, json: async () => ({ members: [] }) });
        if (url.includes("/relationships"))
          return Promise.resolve({ ok: true, json: async () => ({ relationships: [] }) });
        if (url.includes("/arrangement"))
          return Promise.resolve({ ok: true, json: async () => ({ arrangement: null }) });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={false}
        isOwner={false}
        initialMemberCount={0}
        t={translations}
      />,
    );

    await waitFor(() => {
      const canvas = screen.getByTestId("tree-canvas");
      expect(canvas.getAttribute("data-can-edit")).toBe("false");
    });
  });

  it("saves the new arrangement and clears any drag error on successful drag", async () => {
    const user = userEvent.setup();
    const savedArrangements: unknown[] = [];

    setupFetchWithArrangementHandler((body) => {
      savedArrangements.push(body.arrangement);
      return { ok: true, json: async () => ({ arrangement: body.arrangement }) } as Response;
    });

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={true}
        isOwner={false}
        initialMemberCount={1}
        t={translations}
      />,
    );

    const dragBtn = await screen.findByRole("button", { name: "Drag member" });
    await user.click(dragBtn);

    await waitFor(() => {
      expect(savedArrangements).toHaveLength(1);
      expect(savedArrangements[0]).toEqual({ "member-1": { x: 50, y: 100 } });
    });

    expect(screen.queryByText("Unable to save member position.")).toBeNull();
  });

  it("shows an inline error and reverts the node when saving the dragged position fails", async () => {
    const user = userEvent.setup();

    setupFetchWithArrangementHandler(() => ({
      ok: false,
      json: async () => ({ errorCode: "ERR_INTERNAL" }),
    } as Response));

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={true}
        isOwner={false}
        initialMemberCount={1}
        t={translations}
      />,
    );

    const dragBtn = await screen.findByRole("button", { name: "Drag member" });
    await user.click(dragBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to save member position."),
      ).not.toBeNull();
    });
  });

  it("does not expose drag controls to Collaborator Viewers (canEdit=false)", async () => {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({
            ok: true,
            json: async () => ({
              members: [{ id: "member-1", firstName: "Alice" }],
            }),
          });
        if (url.includes("/relationships"))
          return Promise.resolve({ ok: true, json: async () => ({ relationships: [] }) });
        if (url.includes("/arrangement"))
          return Promise.resolve({ ok: true, json: async () => ({ arrangement: null }) });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={false}
        isOwner={false}
        initialMemberCount={1}
        t={translations}
      />,
    );

    await screen.findByTestId("tree-canvas");
    expect(screen.queryByRole("button", { name: "Drag member" })).toBeNull();
  });
});

describe("TreeDetailClient reset layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentViewportWidth = 0;
    mediaQueries = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not show the Reset Layout button to editors (hidden for now)", async () => {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({ ok: true, json: async () => ({ members: [] }) });
        if (url.includes("/relationships"))
          return Promise.resolve({ ok: true, json: async () => ({ relationships: [] }) });
        if (url.includes("/arrangement"))
          return Promise.resolve({ ok: true, json: async () => ({ arrangement: null }) });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={true}
        isOwner={false}
        initialMemberCount={0}
        t={translations}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("tree-canvas")).not.toBeNull();
    });

    expect(screen.queryByRole("button", { name: "Reset Layout" })).toBeNull();
  });

  it("does not show Reset Layout button to non-editors (canEdit=false)", async () => {
    mockMatchMedia(1280);
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/members"))
          return Promise.resolve({ ok: true, json: async () => ({ members: [] }) });
        if (url.includes("/relationships"))
          return Promise.resolve({ ok: true, json: async () => ({ relationships: [] }) });
        if (url.includes("/arrangement"))
          return Promise.resolve({ ok: true, json: async () => ({ arrangement: null }) });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }),
    );

    render(
      <TreeDetailClient
        lang="en"
        treeId="tree-1"
        treeName="Family Tree"
        canEdit={false}
        isOwner={false}
        initialMemberCount={0}
        t={translations}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Reset Layout" })).toBeNull();
    });
  });
});
