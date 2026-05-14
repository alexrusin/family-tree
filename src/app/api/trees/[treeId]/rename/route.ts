import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";

/**
 * POST /api/trees/[treeId]/rename
 * Renames a family tree (owner only).
 *
 * Request body:
 * {
 *   name: string (required, 1-255 characters)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   tree: { ... updated tree ... }
 * }
 */
export async function POST(
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

    const body = await request.json();
    const { name } = body;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Tree name is required and must be a string" },
        { status: 400 },
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 255) {
      return NextResponse.json(
        { error: "Tree name must be between 1 and 255 characters" },
        { status: 400 },
      );
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
        { error: "You do not have permission to rename this tree" },
        { status: 403 },
      );
    }

    // Update the tree name
    const updatedTree = await prisma.familyTree.update({
      where: { id: treeId },
      data: { name: trimmedName },
    });

    return NextResponse.json(
      {
        success: true,
        tree: updatedTree,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error renaming tree:", error);
    return NextResponse.json(
      { error: "Failed to rename tree" },
      { status: 500 },
    );
  }
}
