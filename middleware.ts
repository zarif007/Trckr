import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Import only the middleware-safe helper to avoid pulling in @/auth (NextAuth/Prisma) into the Edge bundle
import { isAuthenticatedRequest } from '@/lib/auth/server/middleware-auth'

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const isLoggedIn = isAuthenticatedRequest(req)
  const isTracker = pathname.startsWith('/tracker')
  const isDashboard = pathname.startsWith('/dashboard')
  const isAnalysis = pathname.startsWith('/analysis')
  const isLogin = pathname === '/login'

  if (isLogin && isLoggedIn) {
    const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
    return NextResponse.redirect(new URL(callbackUrl, req.url))
  }

  if (!isLoggedIn && (isTracker || isDashboard || isAnalysis)) {
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
