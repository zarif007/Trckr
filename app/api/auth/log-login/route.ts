import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/log-login
 * Records a login event (userAgent, IP) for the current user.
 * Call once after sign-in to track where/how they logged in.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headers = await import('next/headers').then((m) => m.headers())
  const userAgent = headers.get('user-agent') ?? undefined
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    undefined

  await prisma.loginEvent.create({
    data: {
      userId: session.user.id,
      userAgent,
      ip,
    },
  })

  return NextResponse.json({ ok: true })
}
