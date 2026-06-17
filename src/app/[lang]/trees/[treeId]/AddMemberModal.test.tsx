/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddMemberModal from "./AddMemberModal";
import type { TreeMemberData } from "@/lib/tree-domain/tree-layout";
import type { PhotoCropModalT } from "../../components/PhotoCropModal";

vi.mock("../../components/PhotoCropModal", () => ({
  default: ({
    isOpen,
    onApply,
    onCancel,
  }: {
    isOpen: boolean;
    onApply: (file: File) => void;
    onCancel: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            onApply(
              new File(["cropped"], "cropped.webp", { type: "image/webp" }),
            )
          }
        >
          Mock Apply Crop
        </button>
        <button type="button" onClick={onCancel}>
          Mock Cancel Crop
        </button>
      </div>
    );
  },
}));

const cropEditorTranslations: PhotoCropModalT = {
  title: "Crop Photo",
  instructions: "Drag to reposition and use the slider to zoom.",
  zoomLabel: "Zoom",
  apply: "Apply",
  cancel: "Cancel",
  closeModal: "Close crop editor",
  processing: "Processing...",
  error: "Unable to process this photo. Please try again.",
};

const translations = {
  addTitle: "Add Member",
  addSubtitle: "Add a new person to this tree.",
  firstName: "First Name",
  firstNamePlaceholder: "Required",
  lastName: "Last Name",
  lastNamePlaceholder: "Optional",
  maidenName: "Maiden Name",
  maidenNamePlaceholder: "Optional",
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
  closeModal: "Close modal",
  cancel: "Cancel",
  saving: "Saving...",
  add: "Add Member",
  errors: {
    ERR_FIRST_NAME_REQUIRED: "First name is required",
    ERR_MEMBER_LIMIT_REACHED: "Member limit reached",
    ERR_IMAGE_TOO_LARGE: "Image must be 5 MB or smaller",
    ERR_UNSUPPORTED_IMAGE_TYPE: "Only JPEG, PNG, and WebP are allowed",
    ERR_FORBIDDEN: "You do not have permission",
    ERR_DEATH_BEFORE_BIRTH: "Death cannot be before birth",
    ERR_INVALID_PARTIAL_DATE: "Enter a valid date",
    memberGeneric: "Unable to add member",
  },
  cropEditor: cropEditorTranslations,
};

const createdMember: TreeMemberData = {
  id: "m1",
  firstName: "Elena",
  lastName: null,
  maidenName: null,
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

describe("AddMemberModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the crop editor on selection and submits the cropped photo in multipart form data", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ member: createdMember }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    const onMemberCreated = vi.fn();
    render(
      <AddMemberModal
        isOpen
        treeId="t1"
        onClose={onClose}
        onMemberCreated={onMemberCreated}
        t={translations}
      />,
    );

    await user.type(screen.getByPlaceholderText("Required"), "Elena");

    const file = new File(["avatar"], "portrait.png", { type: "image/png" });
    const input = screen.getByLabelText(
      "Profile Photo (Optional)",
    ) as HTMLInputElement;

    await user.upload(input, file);

    const applyButton = await screen.findByRole("button", {
      name: "Mock Apply Crop",
    });
    await user.click(applyButton);

    await user.click(screen.getByRole("button", { name: "Add Member" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/trees/t1/members",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = options.body as FormData;
    expect(body.get("firstName")).toBe("Elena");
    expect((body.get("photo") as File).name).toBe("cropped.webp");
    expect((body.get("photo") as File).type).toBe("image/webp");
    expect(onClose).toHaveBeenCalled();
    expect(onMemberCreated).toHaveBeenCalled();
  });

  it("stages nothing when the crop editor is cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ member: createdMember }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AddMemberModal
        isOpen
        treeId="t1"
        onClose={vi.fn()}
        onMemberCreated={vi.fn()}
        t={translations}
      />,
    );

    await user.type(screen.getByPlaceholderText("Required"), "Elena");

    const file = new File(["avatar"], "portrait.png", { type: "image/png" });
    const input = screen.getByLabelText(
      "Profile Photo (Optional)",
    ) as HTMLInputElement;

    await user.upload(input, file);

    const cancelButton = await screen.findByRole("button", {
      name: "Mock Cancel Crop",
    });
    await user.click(cancelButton);

    expect(
      screen.queryByRole("button", { name: "Mock Apply Crop" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add Member" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = options.body as FormData;
    expect(body.get("photo")).toBeNull();
  });

  it("renders maiden name field and includes it in form submission", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi
        .fn()
        .mockResolvedValue({
          member: { ...createdMember, maidenName: "Petrova" },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    const onMemberCreated = vi.fn();
    render(
      <AddMemberModal
        isOpen
        treeId="t1"
        onClose={onClose}
        onMemberCreated={onMemberCreated}
        t={translations}
      />,
    );

    expect(screen.getByText("Maiden Name")).not.toBeNull();

    await user.type(screen.getByPlaceholderText("Required"), "Elena");
    const maidenLabel = screen.getByText("Maiden Name");
    const maidenInput =
      maidenLabel.closest("div")!.querySelector("input")!;
    await user.type(maidenInput, "Petrova");

    await user.click(screen.getByRole("button", { name: "Add Member" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = options.body as FormData;
    expect(body.get("maidenName")).toBe("Petrova");
  });

  it("rejects invalid source files before opening the crop editor", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());

    render(
      <AddMemberModal
        isOpen
        treeId="t1"
        onClose={vi.fn()}
        onMemberCreated={vi.fn()}
        t={translations}
      />,
    );

    const oversizedFile = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "big.png",
      { type: "image/png" },
    );
    const input = screen.getByLabelText(
      "Profile Photo (Optional)",
    ) as HTMLInputElement;

    await user.upload(input, oversizedFile);

    expect(
      await screen.findByText("Image must be 5 MB or smaller"),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Mock Apply Crop" }),
    ).toBeNull();
  });
});
