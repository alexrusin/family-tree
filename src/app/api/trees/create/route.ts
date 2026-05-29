import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "@/lib/auth";
import { generateShareToken } from "@/lib/tree-utils";

/**
 * POST /api/trees/create
 * Creates a new family tree for the authenticated user.
 *
 * Request body:
 * {
 *   name: string (required, 1-255 characters)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   tree: {
 *     id: string,
 *     name: string,
 *     ownerId: string,
 *     shareToken: string,
 *     shareEnabled: boolean,
 *     memberCount: number,
 *     createdAt: Date,
 *     updatedAt: Date,
 *   }
 * }
 * or error response
 */
export async function POST(request: NextRequest) {
  try {
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

    // Create the tree
    const tree = await prisma.familyTree.create({
      data: {
        name: trimmedName,
        ownerId: session.user.id,
        shareToken: generateShareToken(),
        shareEnabled: false,
        memberCount: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tree,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating tree:", error);
    return NextResponse.json(
      { error: "Failed to create tree" },
      { status: 500 },
    );
  }
}
