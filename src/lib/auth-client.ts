import { createAuthClient } from "better-auth/react";

// ============================================================================
// Auth Client Configuration
// ============================================================================

const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

if (!baseURL) {
  throw new Error(
    "NEXT_PUBLIC_BETTER_AUTH_URL environment variable is not set. " +
    "Please check your .env.local file."
  );
}

export const authClient = createAuthClient({
  baseURL,
  // Uncomment for development debugging:
  // credentials: "include",
  // fetchOptions: {
  //   cache: "no-store",
  // },
});
