import { badRequest, jsonOk, readParams, requireParam } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { listConversationsForTracker } from '@/lib/repositories'

type ConversationMode = 'BUILDER' | 'ANALYST'

function parseMode(raw: string | null): ConversationMode | undefined {
  if (!raw) return undefined
  const upper = raw.toUpperCase()
  if (upper === 'BUILDER') return 'BUILDER'
  if (upper === 'ANALYST') return 'ANALYST'
  return undefined
}

/**
 * GET /api/trackers/[id]/conversations?mode=BUILDER|ANALYST
 * Returns all conversations for this tracker (optional mode filter).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const { id } = await readParams(params)
  const trackerId = requireParam(id, 'tracker id')
  if (!trackerId) return badRequest('Missing tracker id')

  const url = new URL(request.url)
  const mode = parseMode(url.searchParams.get('mode'))

  const conversations = await listConversationsForTracker(
    trackerId,
    authResult.user.id,
    mode,
  )
  if (conversations.length === 0) {
    return jsonOk({ conversations: [] })
  }

  return jsonOk({
    conversations: conversations.map((c) => {
      const row = c as unknown as { id: string; title: string | null; mode: ConversationMode; createdAt: Date }
      return {
        id: row.id,
        title: row.title,
        mode: row.mode,
        createdAt: row.createdAt,
      }
    }),
  })
}
