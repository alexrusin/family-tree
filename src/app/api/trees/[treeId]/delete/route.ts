import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";

/**
 * DELETE /api/trees/[treeId]
 * Deletes a family tree and all associated data (owner only).
 * The tree must exist and the user must be the owner.
 *
 * Response:
 * {
 *   success: true,
 *   message: "Tree deleted successfully"
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  try {
    const { treeId } = await params;

    // Get current user from session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize Prisma client
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

    // Check if tree exists and user is the owner
    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
    });

    if (!tree) {
      return NextResponse.json({ error: "Tree not found" }, { status: 404 });
    }

    if (tree.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this tree" },
        { status: 403 },
      );
    }

    // Delete the tree (cascades to collaborators and future members/relationships)
    await prisma.familyTree.delete({
      where: { id: treeId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tree deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting tree:", error);
    return NextResponse.json(
      { error: "Failed to delete tree" },
      { status: 500 },
    );
  }
}
