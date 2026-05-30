export type BirthPrecision = "year" | "month" | "day";
export type MemberGender = "undisclosed" | "male" | "female" | "other";

export interface MemberFormState {
  firstName: string;
  lastName: string;
  gender: MemberGender;
  bio: string;
  isLiving: boolean;
  birthPrecision: BirthPrecision;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  deathPrecision: BirthPrecision;
  deathYear: string;
  deathMonth: string;
  deathDay: string;
}

const MAX_MEMBER_PHOTO_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MEMBER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function initialMemberFormState(): MemberFormState {
  return {
    firstName: "",
    lastName: "",
    gender: "undisclosed",
    bio: "",
    isLiving: true,
    birthPrecision: "year",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    deathPrecision: "year",
    deathYear: "",
    deathMonth: "",
    deathDay: "",
  };
}

export function validateMemberPhotoSelection(input: {
  sizeBytes: number;
  contentType: string;
}): string | null {
  if (!SUPPORTED_MEMBER_PHOTO_TYPES.includes(input.contentType)) {
    return "ERR_UNSUPPORTED_IMAGE_TYPE";
  }

  if (input.sizeBytes > MAX_MEMBER_PHOTO_BYTES) {
    return "ERR_IMAGE_TOO_LARGE";
  }

  return null;
}
