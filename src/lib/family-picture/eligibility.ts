export const FAMILY_PICTURE_MAX_MEMBERS = 8;

export type IneligibleReason =
  | "no-photo"
  | "living-minor"
  | "age-unconfirmable"
  | "over-max";

export type EligibilityDecision =
  | { eligible: true }
  | { eligible: false; reason: IneligibleReason };

export interface EligibilityCandidate {
  id: string;
  isLiving: boolean;
  birthYear: number | null;
  hasProfilePhoto: boolean;
}

/**
 * Decides whether one Member may appear in a Family Picture, independent of
 * any other candidates. Does not enforce the per-picture maximum — see
 * `resolveFamilyPictureEligibility` for that.
 */
export function resolveMemberEligibility(
  member: Pick<EligibilityCandidate, "isLiving" | "birthYear" | "hasProfilePhoto">,
  today: Date,
): EligibilityDecision {
  if (!member.hasProfilePhoto) {
    return { eligible: false, reason: "no-photo" };
  }

  if (member.isLiving) {
    if (member.birthYear == null) {
      return { eligible: false, reason: "age-unconfirmable" };
    }
    const age = today.getFullYear() - member.birthYear;
    if (age < 18) {
      return { eligible: false, reason: "living-minor" };
    }
  }

  return { eligible: true };
}

/**
 * Resolves eligibility for a candidate set, additionally enforcing the
 * per-picture maximum: candidates beyond the max, among those that would
 * otherwise be eligible, are rejected with `over-max` in input order.
 */
export function resolveFamilyPictureEligibility(
  candidates: EligibilityCandidate[],
  today: Date,
  max: number = FAMILY_PICTURE_MAX_MEMBERS,
): Array<{ id: string } & EligibilityDecision> {
  let eligibleCount = 0;

  return candidates.map((candidate) => {
    const decision = resolveMemberEligibility(candidate, today);
    if (!decision.eligible) {
      return { id: candidate.id, ...decision };
    }

    eligibleCount += 1;
    if (eligibleCount > max) {
      return { id: candidate.id, eligible: false, reason: "over-max" as const };
    }
    return { id: candidate.id, eligible: true as const };
  });
}
