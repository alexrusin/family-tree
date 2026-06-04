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

vi.mock("./AddMemberModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-member-modal" /> : null,
}));
vi.mock("./AddRelationshipModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="add-relationship-modal" /> : null,
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
    presentation = "desktop",
    t,
  }: {
    member: { id: string };
    onClose: () => void;
    presentation?: "desktop" | "tablet" | "mobile";
    t: { close: string };
  }) => (
    <aside
      data-testid="member-side-panel"
      data-member-id={member.id}
      data-presentation={presentation}
    >
      <button type="button" onClick={onClose}>
        {t.close}
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
