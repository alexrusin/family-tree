export type TreeRole = "owner" | "editor" | "viewer" | "none";

export function canEditMembers(role: TreeRole): boolean {
  return role === "owner" || role === "editor";
}