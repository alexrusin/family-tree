/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DashboardLayout from "./DashboardLayout";

const { useSearchParamsMock, useRouterMock, dashboardClientMock } =
  vi.hoisted(() => ({
    useSearchParamsMock: vi.fn(),
    useRouterMock: vi.fn(),
    dashboardClientMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
  useRouter: () => useRouterMock(),
}));

vi.mock("./CreateTreeButton", () => ({
  default: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock("./ImportTreeModal", () => ({
  default: () => null,
}));

vi.mock("./ImportReportModal", () => ({
  default: () => null,
}));

vi.mock("./DashboardClient", () => ({
  default: (props: {
    createModalOpen: boolean;
    lang: string;
    myTrees: Array<unknown>;
    sharedTrees: Array<unknown>;
  }) => {
    dashboardClientMock(props);
    return (
      <div data-testid="dashboard-client">
        modal:{String(props.createModalOpen)}
      </div>
    );
  },
}));

const translations = {
  createTree: "Create New Tree",
  title: "My Legacy",
  subtitle: "Manage and explore your genealogy.",
  myTrees: "My Trees",
  sharedWithMe: "Shared With Me",
  members: "Members",
  owner: "Owner",
  lastEdit: "Last Edit",
  emptyTitle: "No trees here yet",
  emptyBody: "Trees shared with you will appear here.",
  emailVerifiedTitle: "Email verified successfully",
  emailVerifiedBody: "Your account is ready.",
  createFirstTreePrompt: "Create your first family tree to get started.",
  cardMenuRename: "Rename",
  cardMenuDelete: "Delete",
  importTree: "Import GEDCOM",
  importModal: {
    title: "Import GEDCOM File",
    description: "Upload a GEDCOM (.ged) file.",
    fileLabel: "GEDCOM File",
    fileHint: "Select a .ged file.",
    cancel: "Cancel",
    submit: "Import",
    submitting: "Importing...",
    errorNoFile: "Please choose a GEDCOM file to import.",
    errorGeneric: "Failed to import the GEDCOM file.",
    errorTooManyMembers: "Too many individuals.",
    errorFileTooLarge: "File too large.",
    errorUnsupportedEncoding: "Unsupported encoding.",
    errorInvalidGedcom: "Invalid GEDCOM file.",
  },
  importReport: {
    title: "Import Complete",
    description: "Your new family tree was created.",
    peopleImported: "People imported",
    close: "Go to tree",
  },
};

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useRouterMock.mockReturnValue({ push: vi.fn() });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the email verified message after verification without opening the modal", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("emailVerified=1"),
    );

    render(
      <DashboardLayout
        t={translations}
        myTrees={[]}
        sharedTrees={[]}
        lang="en"
      />,
    );

    expect(screen.getByText("Email verified successfully")).not.toBeNull();
    expect(screen.getByText("Your account is ready.")).not.toBeNull();
    expect(
      screen.queryByText("Create your first family tree to get started."),
    ).toBeNull();
    expect(screen.getByTestId("dashboard-client").textContent).toContain(
      "modal:false",
    );
  });

  it("shows the email verified message even when the user already owns a tree", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("emailVerified=1"),
    );

    render(
      <DashboardLayout
        t={translations}
        myTrees={[
          {
            id: "tree-1",
            name: "Family Tree",
            memberCount: 0,
            ownerName: "Alex",
            lastEdit: "Now",
            isOwned: true,
          },
        ]}
        sharedTrees={[]}
        lang="en"
      />,
    );

    expect(screen.getByText("Email verified successfully")).not.toBeNull();
    expect(screen.getByText("Your account is ready.")).not.toBeNull();
    expect(
      screen.queryByText("Create your first family tree to get started."),
    ).toBeNull();
    expect(screen.getByTestId("dashboard-client").textContent).toContain(
      "modal:false",
    );
  });
});
