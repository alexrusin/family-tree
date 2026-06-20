import { compareLifeSpan, type PartialDate } from "./date-precision";
import { canEditMembers, type TreeRole } from "./tree-access";
import { DomainError } from "@/lib/domain-error";

export type MemberDatePrecision = "year" | "month" | "day";
export type MemberGenderValue = "male" | "female" | "other" | "undisclosed";
export const MEMBER_HARD_LIMIT = 300;

export interface CreateMemberInput {
  firstName: string;
  isLiving: boolean;
  lastName?: string | null;
  maidenName?: string | null;
  gender?: MemberGenderValue;
  bio?: string | null;
  birthPrecision?: MemberDatePrecision | null;
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  deathPrecision?: MemberDatePrecision | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  photoKey?: string | null;
  photoUrl?: string | null;
}

export async function createMember<TCreated extends { id: string }>(params: {
  repo: {
    getRole: (treeId: string, userId: string) => Promise<TreeRole>;
    getTreeMemberCount: (treeId: string) => Promise<number>;
    createMemberRecord: (
      args: { treeId: string } & CreateMemberInput,
    ) => Promise<TCreated>;
  };
  actorUserId: string;
  treeId: string;
  input: CreateMemberInput;
}): Promise<TCreated> {
  const role = await params.repo.getRole(params.treeId, params.actorUserId);
  if (!canEditMembers(role)) {
    throw new DomainError("ERR_FORBIDDEN");
  }

  if (!params.input.firstName.trim()) {
    throw new DomainError("ERR_FIRST_NAME_REQUIRED");
  }

  const currentCount = await params.repo.getTreeMemberCount(params.treeId);
  if (currentCount >= MEMBER_HARD_LIMIT) {
    throw new DomainError("ERR_MEMBER_LIMIT_REACHED");
  }

  if (params.input.birthYear != null && params.input.deathYear != null) {
    const birth: PartialDate = {
      precision: params.input.birthPrecision ?? "year",
      year: params.input.birthYear,
      month: params.input.birthMonth ?? null,
      day: params.input.birthDay ?? null,
    };
    const death: PartialDate = {
      precision: params.input.deathPrecision ?? "year",
      year: params.input.deathYear,
      month: params.input.deathMonth ?? null,
      day: params.input.deathDay ?? null,
    };
    const chronologyError = compareLifeSpan(birth, death);
    if (chronologyError) {
      throw new DomainError(chronologyError);
    }
  }

  return params.repo.createMemberRecord({
    treeId: params.treeId,
    ...params.input,
    firstName: params.input.firstName.trim(),
  });
}
