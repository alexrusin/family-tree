export type TreeRole = "owner" | "editor" | "viewer" | "none";

export interface TreeRoleClient {
  familyTree: {
    findUnique: (args: {
      where: { id: string };
      select: { ownerId: true };
    }) => Promise<{ ownerId: string } | null>;
  };
  collaborator: {
    findUnique: (args: {
      where: { treeId_userId: { treeId: string; userId: string } };
      select: { role: true; acceptedAt: true };
    }) => Promise<{ role: string; acceptedAt: Date | null } | null>;
  };
}

export async function getTreeRole(
  prisma: TreeRoleClient,
  treeId: string,
  userId: string,
): Promise<TreeRole> {
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { ownerId: true },
  });

  if (!tree) {
    return "none";
  }

  if (tree.ownerId === userId) {
    return "owner";
  }

  const collaborator = await prisma.collaborator.findUnique({
    where: {
      treeId_userId: {
        treeId,
        userId,
      },
    },
    select: {
      role: true,
      acceptedAt: true,
    },
  });

  if (!collaborator || !collaborator.acceptedAt) {
    return "none";
  }

  return collaborator.role as TreeRole;
}

export function canEditMembers(role: TreeRole): boolean {
  return role === "owner" || role === "editor";
}

export function canDeleteMembers(role: TreeRole): boolean {
  return role === "owner";
}
