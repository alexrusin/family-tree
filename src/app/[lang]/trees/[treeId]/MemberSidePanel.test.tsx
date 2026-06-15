/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MemberSidePanel from "./MemberSidePanel";
import type {
  TreeMemberData,
  TreeRelationship,
} from "@/lib/tree-domain/tree-layout";

const member: TreeMemberData = {
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
};

const relationships: TreeRelationship[] = [
  {
    id: "relationship-1",
    fromMemberId: "member-1",
    toMemberId: "member-2",
    type: "sibling",
  },
];

const translations = {
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
  divorcedOf: "Divorced from",
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
};

describe("MemberSidePanel positioning", () => {
  it.each([
    ["tablet", "absolute inset-0 z-40"],
    ["mobile", "absolute inset-0 z-40"],
    ["desktop", "absolute inset-y-0 right-0 z-40"],
  ] as const)("renders the %s panel within its workspace bounds", (presentation, expected) => {
    const { container } = render(
      <MemberSidePanel
        member={member}
        allRelationships={relationships}
        getMemberName={() => "Charles Babbage"}
        canEdit={false}
        isOwner={false}
        treeId="tree-1"
        onClose={() => {}}
        onEditClick={() => {}}
        onDeleted={() => {}}
        onRelationshipRemoved={() => {}}
        presentation={presentation}
        t={translations}
      />,
    );

    expect(container.firstElementChild?.className).toContain(expected);
    expect(container.firstElementChild?.className).not.toContain("fixed");
  });
});
