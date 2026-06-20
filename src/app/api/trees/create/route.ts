import { withSession } from "@/lib/with-session";
import { generateShareToken } from "@/lib/tree-utils";

export const POST = withSession(async ({ prisma, user, request }) => {
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return Response.json({ errorCode: "ERR_TREE_NAME_REQUIRED" }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0 || trimmedName.length > 255) {
    return Response.json({ errorCode: "ERR_TREE_NAME_LENGTH" }, { status: 400 });
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
