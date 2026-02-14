import managerPrompt from '@/lib/prompts/manager'
import trackerBuilderPrompt from '@/lib/prompts/trackerBuilder'
import { multiAgentSchema, type MultiAgentSchema } from '@/lib/schemas/multi-agent'
import { deepseek } from '@ai-sdk/deepseek'
import { generateObject, streamObject } from 'ai'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'An unexpected error occurred'
  }
}

// DeepSeek Chat max output is 8K; requesting more can cause truncation and invalid JSON
const DEEPSEEK_CHAT_MAX_OUTPUT = 8192
const DEFAULT_MAX_OUTPUT_TOKENS = DEEPSEEK_CHAT_MAX_OUTPUT
const MAX_OUTPUT_TOKENS = process.env.DEEPSEEK_MAX_OUTPUT_TOKENS
  ? Math.min(DEEPSEEK_CHAT_MAX_OUTPUT, Math.max(1024, parseInt(process.env.DEEPSEEK_MAX_OUTPUT_TOKENS, 10) || DEFAULT_MAX_OUTPUT_TOKENS))
  : DEFAULT_MAX_OUTPUT_TOKENS

const MAX_FALLBACK_ATTEMPTS = 3

export async function POST(request: Request) {
  try {
    let body: { query?: unknown; messages?: unknown }
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { error: 'Invalid request body. Expected JSON with "query" and optional "messages".' },
        { status: 400 },
      )
    }

    const { query, messages } = body

    if (!query || typeof query !== 'string') {
      return Response.json(
        { error: 'Query is required and must be a non-empty string.' },
        { status: 400 },
      )
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 },
      )
    }

    const MAX_CONTEXT_MESSAGES_PER_ROLE = 2

    let conversationContext = ''

    if (messages && Array.isArray(messages) && messages.length > 0) {
      const userMessages = messages.filter((m: { role?: string }) => m.role === 'user')
      const assistantMessages = messages.filter((m: { role?: string }) => m.role === 'assistant')

      const lastUser = userMessages.slice(-MAX_CONTEXT_MESSAGES_PER_ROLE)
      const lastAssistant = assistantMessages.slice(-MAX_CONTEXT_MESSAGES_PER_ROLE)

      const contextParts: string[] = []

      for (const msg of lastUser) {
        contextParts.push(`User: ${msg.content}`)
      }

      for (const msg of lastAssistant) {
        const assistantMsgParts = []

        if (msg.managerData) {
          const { thinking, prd, builderTodo } = msg.managerData
          assistantMsgParts.push(`Manager Thinking: ${thinking}`)
          assistantMsgParts.push(`PRD: ${JSON.stringify(prd, null, 2)}`)
          if (builderTodo && builderTodo.length > 0) {
            assistantMsgParts.push(
              `Builder Tasks: ${JSON.stringify(builderTodo, null, 2)}`,
            )
          }
        }

        if (msg.trackerData) {
          const {
            tabs = [],
            sections = [],
            grids = [],
            fields = [],
          } = msg.trackerData

          const currentTrackerState = {
            tabs: tabs.map((t: any) => ({
              id: t.id,
              name: t.name,
              placeId: t.placeId,
              config: t.config ?? {},
            })),
            sections: sections.map((s: any) => ({
              id: s.id,
              name: s.name,
              tabId: s.tabId,
              placeId: s.placeId,
              config: s.config ?? {},
            })),
            grids: grids.map((g: any) => ({
              id: g.id,
              name: g.name,
              sectionId: g.sectionId,
              placeId: g.placeId,
              config: g.config ?? {},
              views: g.views ?? [],
            })),
            fields: fields.map((f: any) => ({
              id: f.id,
              dataType: f.dataType,
              ui: f.ui,
              config: f.config ?? {}, // validations, isRequired, isDisabled, isHidden
            })),
            layoutNodes: (msg.trackerData as any).layoutNodes || [],
            bindings: (msg.trackerData as any).bindings || {},
            dependsOn: (msg.trackerData as any).dependsOn || [],
          }

          assistantMsgParts.push(
            `Current Tracker State (JSON): ${JSON.stringify(currentTrackerState, null, 2)}`,
          )
        }

        if (msg.content) {
          assistantMsgParts.push(msg.content)
        }

        if (assistantMsgParts.length > 0) {
          contextParts.push(`Assistant:\n${assistantMsgParts.join('\n')}`)
        }
      }

      conversationContext = contextParts.join('\n\n') + '\n\n'
    }

    const hasMessages = Array.isArray(messages) && messages.length > 0
    const fullPrompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${hasMessages ? 'update or modify' : 'create'} the tracker according to the user's latest request.`
      : query

    // Fallback prompts (used when initial generation fails); max 3 fallbacks
    const fallbackPrompts: string[] = [
      `${conversationContext}User: ${query}\n\nSimplify the request: output a minimal valid tracker (one tab, one section, one grid, a few fields) that matches the user's intent. Always include both "manager" and "tracker" in valid JSON.`,
      `${conversationContext}User: ${query}\n\nOutput only a minimal valid tracker JSON: one tab, one section, one grid, and one text field. Include "manager" (brief) and "tracker" with tabs, sections, grids, fields, layoutNodes, and bindings.`,
      'Output a minimal valid tracker JSON with one tab "Main", one section "Default", one grid "Grid 1", one text field "Name", and empty layoutNodes and bindings. Include a brief "manager" object with thinking, prd, and builderTodo.',
    ]

    const combinedSystemPrompt = `
      ${managerPrompt}
      
      ---
      
      ONCE YOU HAVE COMPLETED THE PRD, act as the "Builder Agent" and implement the technical schema.
      
      ${trackerBuilderPrompt}
      
      CRITICAL: You are a unified system. You MUST generate a response containing TWO parts:
      1. "manager": The breakdown of requirements.
      2. Either "tracker" (full schema) OR "trackerPatch" (incremental changes).

      NEVER stop after the manager object. The user will see an error if neither 'tracker' nor 'trackerPatch' is present.
      You MUST populate the 'tracker' object (first-time build) or 'trackerPatch' (incremental update) based on the manager's PRD.

      PATCH MODE (when "Current Tracker State (JSON)" is present):
      - Output ONLY "trackerPatch" (do not output the full "tracker").
      - Include ONLY the items that changed.
      - For tabs/sections/grids/fields/layoutNodes: include the item with its id (layoutNodes use gridId + fieldId).
      - To delete an item, include it with "_delete": true.
      - For new items, include all required fields (id, name, placeId, config, etc.).
      - For updates, include only changed fields (plus id).
      - For bindings, set keys in "bindings"; set a key to null to delete it. Optionally list keys in "bindingsRemove".
      - For dependsOn, include the full updated dependsOn array if it changed.

      OUTPUT LIMIT: You have a strict token limit (~8K). Keep manager "thinking" brief (2-4 sentences).
      Always output valid, complete JSON: close every brace and bracket. If the tracker would be very large,
      output a complete but minimal tracker (fewer optional fields); the user can ask to add more.
    `

    const hasValidOutput = (obj: MultiAgentSchema | undefined) =>
      obj != null && (obj.tracker != null || obj.trackerPatch != null)

    const returnAsStream = (object: MultiAgentSchema) => {
      const json = JSON.stringify(object)
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(json)
          controller.close()
        },
      })
      return new Response(stream.pipeThrough(new TextEncoderStream()), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Try streaming first for best UX; if it throws (e.g. API error), use generateObject fallbacks
    try {
      const result = streamObject({
        model: deepseek('deepseek-chat'),
        system: combinedSystemPrompt,
        prompt: fullPrompt,
        schema: multiAgentSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        onFinish: ({ object: finalObject, error: validationError }) => {
          if (validationError) {
            console.error('[generate-tracker] Final object failed validation:', validationError)
          }
          if (!finalObject?.tracker && !finalObject?.trackerPatch && !validationError) {
            console.warn('[generate-tracker] Stream finished but no tracker/patch in response (possible max tokens or empty output)')
          }
        },
      })
      return result.toTextStreamResponse()
    } catch {
      // Stream failed; run fallbacks with generateObject (so we can retry on invalid output)
    }

    // Fallback: up to MAX_FALLBACK_ATTEMPTS (3) with different prompts
    let lastError: unknown = null
    for (let i = 0; i < MAX_FALLBACK_ATTEMPTS; i++) {
      try {
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          system: combinedSystemPrompt,
          prompt: fallbackPrompts[i],
          schema: multiAgentSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        })
        if (hasValidOutput(object as MultiAgentSchema)) {
          return returnAsStream(object as MultiAgentSchema)
        }
      } catch (err) {
        lastError = err
        console.warn(`[generate-tracker] Fallback ${i + 1}/${MAX_FALLBACK_ATTEMPTS} failed:`, getErrorMessage(err))
      }
    }

    const message = lastError != null ? getErrorMessage(lastError) : 'Generation failed after initial try and all fallbacks (no valid tracker or trackerPatch).'
    console.error('[generate-tracker] All attempts failed:', message)
    return Response.json(
      { error: message || 'Failed to generate tracker. Please try again.' },
      { status: 500 },
    )
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('Error generating tracker:', message, error)
    return Response.json(
      { error: message || 'Failed to generate tracker. Please try again.' },
      { status: 500 },
    )
  }
}
