import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

const LOCALES = ['en', 'ru'] as const
const DEFAULT_LOCALE = 'en'
const PROTECTED_PATHS = ['/dashboard'] as const
const AUTH_PATHS = ['/login', '/register'] as const

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') ?? ''
  // Parse the Accept-Language header and find the best match
  const preferred = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0].trim().toLowerCase().slice(0, 2))
  for (const lang of preferred) {
    if ((LOCALES as readonly string[]).includes(lang)) {
      return lang
    }
  }
  return DEFAULT_LOCALE
}

function startsWithPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if pathname already has a supported locale prefix
  const pathnameHasLocale = LOCALES.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    // Redirect to locale-prefixed path
    const locale = getLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  const locale = pathname.split('/')[1]
  const subpath = pathname.slice(locale.length + 1) || '/'
  const normalizedSubpath = subpath.startsWith('/') ? subpath : `/${subpath}`

  const isProtectedPath = PROTECTED_PATHS.some((route) =>
    startsWithPath(normalizedSubpath, route)
  )
  const isAuthPath = AUTH_PATHS.some((route) => startsWithPath(normalizedSubpath, route))

  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({ headers: request.headers })

  if (!session && isProtectedPath) {
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/${locale}/login`
    return NextResponse.redirect(redirectURL)
  }

  if (session && isAuthPath) {
    const redirectURL = request.nextUrl.clone()
    redirectURL.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(redirectURL)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip _next internals, static files, and API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
