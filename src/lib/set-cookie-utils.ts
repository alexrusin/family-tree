export function appendSetCookieHeaders(source: Headers, target: Headers): void {
  const sourceWithGetSetCookie = source as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof sourceWithGetSetCookie.getSetCookie === "function") {
    const cookies = sourceWithGetSetCookie.getSetCookie();
    for (const cookie of cookies) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const fallbackSetCookie = source.get("set-cookie");
  if (fallbackSetCookie) {
    target.append("set-cookie", fallbackSetCookie);
  }
}
