/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DashboardLayout from "./DashboardLayout";

const { useSearchParamsMock, dashboardClientMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  dashboardClientMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("./CreateTreeButton", () => ({
  default: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
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
};

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the verification welcome and opens the first-tree flow for new users", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("emailVerified=1&welcome=create-tree"),
    );

    render(
      <DashboardLayout
        t={translations}
        myTrees={[]}
        sharedTrees={[]}
        lang="en"
      />,
    );

    expect(
      screen.getByText("Email verified successfully"),
    ).not.toBeNull();
    expect(
      screen.getByText("Create your first family tree to get started."),
    ).not.toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Create New Tree" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByTestId("dashboard-client").textContent).toContain(
      "modal:true",
    );
  });

  it("shows success feedback without auto-opening the modal when the user already owns a tree", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("emailVerified=1&welcome=create-tree"),
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
    expect(
      screen.queryByText("Create your first family tree to get started."),
    ).toBeNull();
    expect(screen.getByTestId("dashboard-client").textContent).toContain(
      "modal:false",
    );
  });
});
