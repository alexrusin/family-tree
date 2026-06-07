/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddRelationshipModal from "./AddRelationshipModal";

const translations = {
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
  cancel: "Cancel",
  saving: "Saving...",
  add: "Add Relationship",
  errors: {
    ERR_INVALID_RELATIONSHIP: "Invalid relationship",
    ERR_SELF_RELATIONSHIP: "Self relationship",
    ERR_DUPLICATE_RELATIONSHIP: "Relationship exists",
    ERR_FORBIDDEN: "Forbidden",
    relationshipGeneric: "Unable to add relationship",
    chooseTwoMembers: "Choose two members.",
    chooseDifferentMembers: "Choose two different members.",
  },
};

const members = [
  { id: "m1", firstName: "Elena", lastName: "Rusin" },
  { id: "m2", firstName: "Marco", lastName: "Diaz" },
  { id: "m3", firstName: "Sofia", lastName: null },
];

describe("AddRelationshipModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters members and submits selected pair", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        relationship: {
          id: "r1",
          fromMemberId: "m1",
          toMemberId: "m2",
          type: "parent",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    const onRelationshipCreated = vi.fn();

    render(
      <AddRelationshipModal
        isOpen
        treeId="tree-1"
        members={members}
        onClose={onClose}
        onRelationshipCreated={onRelationshipCreated}
        t={translations}
      />,
    );

    const memberButtons = screen.getAllByRole("button", { name: "Select member" });
    await user.click(memberButtons[0]);
    await user.type(screen.getByPlaceholderText("Search members"), "elena");
    await user.click(screen.getByRole("option", { name: "Elena Rusin" }));

    await user.click(screen.getByRole("button", { name: "Select member" }));
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).queryByRole("option", { name: "Elena Rusin" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Marco Diaz" }));

    await user.click(screen.getByRole("button", { name: "Add Relationship" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/trees/tree-1/relationships",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({
        fromMemberId: "m1",
        toMemberId: "m2",
        type: "parent",
      }),
    });
    expect(onClose).toHaveBeenCalled();
    expect(onRelationshipCreated).toHaveBeenCalled();
  });

  it("shows localized empty state when search has no matches", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());

    render(
      <AddRelationshipModal
        isOpen
        treeId="tree-1"
        members={members}
        onClose={vi.fn()}
        onRelationshipCreated={vi.fn()}
        t={translations}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Select member" })[0]);
    await user.type(screen.getByPlaceholderText("Search members"), "zzzzz");

    expect(screen.getByText("No members found.")).not.toBeNull();
  });
});
