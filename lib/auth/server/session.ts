import { auth } from '@/auth'
import { unauthorized } from '@/lib/api/http'

export interface AuthenticatedUser {
 id: string
 email?: string | null
 name?: string | null
}

export type RequireAuthResult =
 | { ok: true; user: AuthenticatedUser }
 | { ok: false; response: Response }

export async function requireAuthenticatedUser(): Promise<RequireAuthResult> {
 const session = await auth()
 const userId = session?.user?.id

 if (!userId) {
 return { ok: false, response: unauthorized() }
 }

 return {
 ok: true,
 user: {
 id: userId,
 email: session.user?.email ?? null,
 name: session.user?.name ?? null,
 },
 }
}

