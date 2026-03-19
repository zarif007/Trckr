import { jsonOk } from '@/lib/api'
import { requireAuthenticatedUser } from '@/lib/auth/server'
import { getLlmUsageDashboard } from '@/lib/llm-usage'

export async function GET() {
  const authResult = await requireAuthenticatedUser()
  if (!authResult.ok) return authResult.response

  const data = await getLlmUsageDashboard(authResult.user.id)
  return jsonOk(data)
}
