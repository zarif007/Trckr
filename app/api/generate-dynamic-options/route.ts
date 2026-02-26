import { generateDynamicOptionFunction } from './lib/generate'
import { getErrorMessage, parseRequestBody } from './lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = parseRequestBody(body)
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status })
    }

    const result = await generateDynamicOptionFunction({
      prompt: parsed.prompt,
      functionId: parsed.functionId,
      functionName: parsed.functionName,
      currentTracker: parsed.currentTracker,
      sampleResponse: parsed.sampleResponse,
    })

    return Response.json(result)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[generate-dynamic-options] Error:', message)
    return Response.json(
      { error: message || 'Failed to generate dynamic options function' },
      { status: 500 }
    )
  }
}
