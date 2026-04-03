import { jsonOk } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { createLoginEvent } from '@/lib/repositories'

/**
 * POST /api/auth/log-login
 * Records a login event (userAgent, IP) for the current user.
 * Call once after sign-in to track where/how they logged in.
 */
export async function POST() {
 const authResult = await requireAuthenticatedUser()
 if (!authResult.ok) return authResult.response

 const headers = await import('next/headers').then((m) => m.headers())
 const userAgent = headers.get('user-agent') ?? undefined
 const ip =
 headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
 headers.get('x-real-ip') ??
 undefined

 await createLoginEvent({
 userId: authResult.user.id,
 userAgent,
 ip,
 })

 return jsonOk({ ok: true })
}
