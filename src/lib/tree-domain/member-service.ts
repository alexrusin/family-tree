import { canEditMembers, type TreeRole } from "./tree-access";

export async function createMember(params: {
  repo: {
    getRole: (treeId: string, userId: string) => Promise<TreeRole>;
    createMemberRecord: (args: {
      treeId: string;
      firstName: string;
      isLiving: boolean;
    }) => Promise<{ id: string }>;
  };
  actorUserId: string;
  treeId: string;
  input: { firstName: string; isLiving: boolean };
}): Promise<{ id: string }> {
  const role = await params.repo.getRole(params.treeId, params.actorUserId);
  if (!canEditMembers(role)) {
    throw new Error("ERR_FORBIDDEN");
  }

  if (!params.input.firstName.trim()) {
    throw new Error("ERR_FIRST_NAME_REQUIRED");
  }

  return params.repo.createMemberRecord({
    treeId: params.treeId,
    firstName: params.input.firstName.trim(),
    isLiving: params.input.isLiving,
  });
}