import { describe, expect, it } from "vitest";
import { formatPublicBirthLabel } from "./public-member-view";

describe("formatPublicBirthLabel", () => {
  it("masks living member birth data", () => {
    const label = formatPublicBirthLabel({
      isLiving: true,
      birthYear: 1984,
      locale: "en",
    });

    expect(label).toBe("b. ••••");
  });

  it("shows year when not living", () => {
    const label = formatPublicBirthLabel({
      isLiving: false,
      birthYear: 1984,
      locale: "en",
    });

    expect(label).toBe("b. 1984");
  });

  it("shows unknown when year is missing", () => {
    const label = formatPublicBirthLabel({
      isLiving: false,
      birthYear: null,
      locale: "en",
    });

    expect(label).toBe("b. unknown");
  });

  it("uses Russian birth label when locale is ru", () => {
    const label = formatPublicBirthLabel({
      isLiving: false,
      birthYear: 1984,
      locale: "ru",
    });

    expect(label).toBe("р. 1984");
  });
});
