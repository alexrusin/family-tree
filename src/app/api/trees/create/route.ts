import { withSession } from "@/lib/with-session";
import { DomainError } from "@/lib/domain-error";
import { generateShareToken } from "@/lib/tree-utils";

export const POST = withSession(async ({ prisma, user, request }) => {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    throw new DomainError("ERR_TREE_NAME_REQUIRED");
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 255) {
    throw new DomainError("ERR_TREE_NAME_LENGTH");
  }

  const tree = await prisma.familyTree.create({
    data: {
      name: trimmedName,
      ownerId: user.id,
      shareToken: generateShareToken(),
      shareEnabled: false,
      memberCount: 0,
    },
  });

  return Response.json({ success: true, tree }, { status: 201 });
});
