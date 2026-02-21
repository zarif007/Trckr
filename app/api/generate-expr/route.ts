import { parseRequestBody, getErrorMessage } from './lib/validation'
import { deriveAvailableFields } from './lib/prompts'
import { generateExpr } from './lib/generate'

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json(
        {
          error: 'Invalid request body. Expected JSON with "prompt", "gridId", and "fieldId".',
        },
        { status: 400 }
      )
    }

    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status })
    }

    const { prompt, gridId, fieldId, currentTracker } = parsed
    const availableFields = deriveAvailableFields(currentTracker, gridId)

    try {
      const { expr } = await generateExpr({
        prompt,
        gridId,
        fieldId,
        availableFields,
      })
      return Response.json({ expr })
    } catch (error) {
      const message = getErrorMessage(error)
      console.error('[generate-expr] Error:', message)
      return Response.json(
        { error: message || 'Failed to generate expression.' },
        { status: 500 }
      )
    }
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[generate-expr] Unexpected error:', message)
    return Response.json(
      { error: message || 'Failed to generate expression.' },
      { status: 500 }
    )
  }
}
