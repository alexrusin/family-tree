/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditMemberModal from "./EditMemberModal";
import type { TreeMemberData } from "@/lib/tree-domain/tree-layout";

const translations = {
  editTitle: "Edit Member",
  editSubtitle: "Update this person's information.",
  firstName: "First Name",
  firstNamePlaceholder: "Required",
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
  profilePhoto: "Profile Photo (Optional)",
  isLiving: "Living member",
  update: "Save Changes",
  closeModal: "Close modal",
  currentPhotoAlt: "Current photo",
  addPhoto: "Add Photo",
  updatePhoto: "Update Photo",
  cancel: "Cancel",
  saving: "Saving...",
  errors: {
    ERR_FIRST_NAME_REQUIRED: "First name is required",
    ERR_IMAGE_TOO_LARGE: "Image must be 5 MB or smaller",
    ERR_UNSUPPORTED_IMAGE_TYPE: "Only JPEG, PNG, and WebP are allowed",
    ERR_FORBIDDEN: "You do not have permission",
    ERR_DEATH_BEFORE_BIRTH: "Death cannot be before birth",
    ERR_INVALID_PARTIAL_DATE: "Enter a valid date",
    memberGeneric: "Unable to update member",
  },
};

const baseMember: TreeMemberData = {
  id: "m1",
  firstName: "Elena",
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
  gender: "female",
};

describe("EditMemberModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits a selected photo in multipart form data", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ member: baseMember }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    const onMemberUpdated = vi.fn();
    render(
      <EditMemberModal
        isOpen
        treeId="t1"
        member={baseMember}
        onClose={onClose}
        onMemberUpdated={onMemberUpdated}
        t={translations}
      />,
    );

    const file = new File(["avatar"], "portrait.png", { type: "image/png" });
    const input = screen.getByLabelText("Add Photo") as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/trees/t1/members/m1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = options.body as FormData;
    expect(body.get("firstName")).toBe("Elena");
    expect((body.get("photo") as File).name).toBe("portrait.png");
    expect(onClose).toHaveBeenCalled();
    expect(onMemberUpdated).toHaveBeenCalled();
  });

  it("shows update photo copy for members with an existing photo and blocks invalid uploads", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EditMemberModal
        isOpen
        treeId="t1"
        member={{ ...baseMember, photoUrl: "/api/trees/t1/members/m1/photo" }}
        onClose={vi.fn()}
        onMemberUpdated={vi.fn()}
        t={translations}
      />,
    );

    expect(screen.getByLabelText("Update Photo")).not.toBeNull();
    expect(screen.getByAltText("Current photo")).not.toBeNull();

    const oversizedFile = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "big.png",
      { type: "image/png" },
    );

    await user.upload(
      screen.getByLabelText("Update Photo") as HTMLInputElement,
      oversizedFile,
    );

    expect(screen.getByText("Image must be 5 MB or smaller")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
