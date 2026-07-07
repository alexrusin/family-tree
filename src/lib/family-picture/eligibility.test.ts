import { describe, expect, it } from "vitest";
import {
  FAMILY_PICTURE_MAX_MEMBERS,
  resolveFamilyPictureEligibility,
  resolveMemberEligibility,
  type EligibilityCandidate,
} from "./eligibility";

const TODAY = new Date("2026-07-04T00:00:00Z");

function candidate(overrides: Partial<EligibilityCandidate> = {}): EligibilityCandidate {
  return {
    id: "member-1",
    isLiving: true,
    birthYear: 1990,
    hasProfilePhoto: true,
    ...overrides,
  };
}

describe("resolveMemberEligibility", () => {
  it("is eligible for a deceased member with a profile photo, regardless of age", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: false, birthYear: 1900, hasProfilePhoto: true }),
        TODAY,
      ),
    ).toEqual({ eligible: true });
  });

  it("is eligible for a deceased member with no birth year at all", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: false, birthYear: null, hasProfilePhoto: true }),
        TODAY,
      ),
    ).toEqual({ eligible: true });
  });

  it("is ineligible for a living member under 18 by recorded birth year", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: true, birthYear: 2017, hasProfilePhoto: true }),
        TODAY,
      ),
    ).toEqual({ eligible: false, reason: "living-minor" });
  });

  it("is eligible for a living member who turns 18 this year", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: true, birthYear: 2008, hasProfilePhoto: true }),
        TODAY,
      ),
    ).toEqual({ eligible: true });
  });

  it("is ineligible for a living member with no recorded birth year", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: true, birthYear: null, hasProfilePhoto: true }),
        TODAY,
      ),
    ).toEqual({ eligible: false, reason: "age-unconfirmable" });
  });

  it("is ineligible for a member with no profile photo, regardless of other fields", () => {
    expect(
      resolveMemberEligibility(
        candidate({ isLiving: false, birthYear: 1900, hasProfilePhoto: false }),
        TODAY,
      ),
    ).toEqual({ eligible: false, reason: "no-photo" });

    expect(
      resolveMemberEligibility(
        candidate({ isLiving: true, birthYear: 2017, hasProfilePhoto: false }),
        TODAY,
      ),
    ).toEqual({ eligible: false, reason: "no-photo" });

    expect(
      resolveMemberEligibility(
        candidate({ isLiving: true, birthYear: null, hasProfilePhoto: false }),
        TODAY,
      ),
    ).toEqual({ eligible: false, reason: "no-photo" });
  });
});

describe("resolveFamilyPictureEligibility", () => {
  it("passes every candidate when the set is at the max", () => {
    const candidates = Array.from({ length: FAMILY_PICTURE_MAX_MEMBERS }, (_, i) =>
      candidate({ id: `member-${i}` }),
    );

    const results = resolveFamilyPictureEligibility(candidates, TODAY);

    expect(results).toHaveLength(FAMILY_PICTURE_MAX_MEMBERS);
    expect(results.every((r) => r.eligible)).toBe(true);
  });

  it("passes every candidate when the set is below the max", () => {
    const candidates = [candidate({ id: "a" }), candidate({ id: "b" })];

    const results = resolveFamilyPictureEligibility(candidates, TODAY);

    expect(results).toEqual([
      { id: "a", eligible: true },
      { id: "b", eligible: true },
    ]);
  });

  it("rejects the overflow beyond the max with over-max, in input order", () => {
    const candidates = Array.from({ length: FAMILY_PICTURE_MAX_MEMBERS + 2 }, (_, i) =>
      candidate({ id: `member-${i}` }),
    );

    const results = resolveFamilyPictureEligibility(candidates, TODAY);

    expect(results.slice(0, FAMILY_PICTURE_MAX_MEMBERS).every((r) => r.eligible)).toBe(
      true,
    );
    expect(results.slice(FAMILY_PICTURE_MAX_MEMBERS)).toEqual([
      { id: "member-8", eligible: false, reason: "over-max" },
      { id: "member-9", eligible: false, reason: "over-max" },
    ]);
  });

  it("does not let an ineligible candidate consume a max slot", () => {
    const candidates = [
      candidate({ id: "no-photo", hasProfilePhoto: false }),
      ...Array.from({ length: FAMILY_PICTURE_MAX_MEMBERS }, (_, i) =>
        candidate({ id: `member-${i}` }),
      ),
    ];

    const results = resolveFamilyPictureEligibility(candidates, TODAY);

    expect(results[0]).toEqual({ id: "no-photo", eligible: false, reason: "no-photo" });
    expect(results.slice(1).every((r) => r.eligible)).toBe(true);
  });

  it("honors a custom max", () => {
    const candidates = [candidate({ id: "a" }), candidate({ id: "b" }), candidate({ id: "c" })];

    const results = resolveFamilyPictureEligibility(candidates, TODAY, 2);

    expect(results).toEqual([
      { id: "a", eligible: true },
      { id: "b", eligible: true },
      { id: "c", eligible: false, reason: "over-max" },
    ]);
  });
});
