export function isPublicSharePath(pathname: string): boolean {
  return pathname === "/t" || pathname.startsWith("/t/");
}
