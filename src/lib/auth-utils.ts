import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { auth } from "./auth";

/**
 * Gets the current user from the auth session.
 * This function should only be called from server-side code (Server Components, API routes, etc.)
 *
 * @returns The current user object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session?.user || null;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Gets the current user ID from the auth session.
 * Useful for database queries that need the user ID.
 *
 * @returns The current user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}
