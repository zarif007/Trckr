import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lightweight auth check using session cookie directly
// Avoids importing heavy auth/prisma dependencies in Edge Runtime
function getSessionToken(req: NextRequest): string | undefined {
  const cookie = req.cookies.get('authjs.session-token')?.value
  if (cookie) return cookie
  
  // Support for production cookie name
  return req.cookies.get('__Secure-authjs.session-token')?.value
}

function isValidSession(token: string | undefined): boolean {
  // Simple presence check - actual validation happens in API routes
  return !!token && token.length > 0
}

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const sessionToken = getSessionToken(req)
  const isLoggedIn = isValidSession(sessionToken)
  const isTracker = pathname.startsWith('/tracker')
  const isLogin = pathname === '/login'

  if (isLogin && isLoggedIn) {
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/tracker'
    return NextResponse.redirect(new URL(callbackUrl, req.url))
  }

  if (!isLoggedIn && isTracker) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
