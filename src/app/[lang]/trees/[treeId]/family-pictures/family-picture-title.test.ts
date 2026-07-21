import { describe, expect, it } from "vitest";
import { familyPictureTitle } from "./family-picture-title";

function picture(...firstNames: string[]) {
  return { memberSnapshot: firstNames.map((firstName) => ({ firstName })) };
}

describe("familyPictureTitle", () => {
  it("lists every first name when there are three or fewer", () => {
    expect(familyPictureTitle(picture("Anna"))).toBe("Anna");
    expect(familyPictureTitle(picture("Anna", "Mikhail"))).toBe("Anna, Mikhail");
    expect(familyPictureTitle(picture("Anna", "Mikhail", "Elena"))).toBe(
      "Anna, Mikhail, Elena",
    );
  });

  it("summarizes the tail once there are more than three", () => {
    expect(familyPictureTitle(picture("Anna", "Mikhail", "Elena", "Sofia"))).toBe(
      "Anna, Mikhail & 2 more",
    );
    expect(
      familyPictureTitle(picture("Anna", "Mikhail", "Elena", "Sofia", "Lev")),
    ).toBe("Anna, Mikhail & 3 more");
  });

  it("returns an empty title when the snapshot has no members", () => {
    expect(familyPictureTitle(picture())).toBe("");
  });
});
