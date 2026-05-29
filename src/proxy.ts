import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isPublicSharePath } from "@/lib/public-route";
import { DEFAULT_LOCALE, getPreferredLocale, isLocale } from "@/lib/locale";

const PROTECTED_PATHS = ["/dashboard", "/settings"] as const;
const AUTH_PATHS = ["/login", "/register"] as const;

function startsWithPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicSharePath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // Check if pathname already has a supported locale prefix
  const pathnameHasLocale = isLocale(pathname.split("/")[1] ?? "");

  if (!pathnameHasLocale) {
    // Redirect to locale-prefixed path
    const session = await auth.api.getSession({ headers: request.headers });
    const sessionLocale = (session?.user as { locale?: string } | undefined)
      ?.locale;
    const locale = isLocale(sessionLocale ?? "")
      ? sessionLocale!
      : getPreferredLocale(request.headers.get("accept-language") ?? "");
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = pathname.split("/")[1];
  const subpath = pathname.slice(locale.length + 1) || "/";
  const normalizedSubpath = subpath.startsWith("/") ? subpath : `/${subpath}`;

  const isProtectedPath = PROTECTED_PATHS.some((route) =>
    startsWithPath(normalizedSubpath, route),
  );
  const isAuthPath = AUTH_PATHS.some((route) =>
    startsWithPath(normalizedSubpath, route),
  );

  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session && isProtectedPath) {
    const redirectURL = request.nextUrl.clone();
    redirectURL.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectURL);
  }

  if (session && isAuthPath) {
    const redirectURL = request.nextUrl.clone();
    redirectURL.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(redirectURL);
  }

  return NextResponse.next();
}

export { DEFAULT_LOCALE };

export const config = {
  matcher: [
    // Skip _next internals, static files, and API routes
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
