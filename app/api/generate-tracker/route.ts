import managerPrompt from '@/constants/systemPrompts/manager'
import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { multiAgentSchema } from '@/lib/schemas/multi-agent'
import { deepseek } from '@ai-sdk/deepseek'
import { streamObject } from 'ai'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'An unexpected error occurred'
  }
}

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

    let conversationContext = ''

    if (messages && Array.isArray(messages) && messages.length > 0) {
      const contextParts: string[] = []

      for (const msg of messages) {
        if (msg.role === 'user') {
          contextParts.push(`User: ${msg.content}`)
        } else if (msg.role === 'assistant') {
          let assistantMsgParts = []

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
                type: g.type,
                sectionId: g.sectionId,
                placeId: g.placeId,
                config: g.config ?? {},
              })),
              fields: fields.map((f: any) => ({
                id: f.id,
                dataType: f.dataType,
                ui: f.ui,
                config: f.config ?? {}, // validations, isRequired, isDisabled, isHidden
              })),
              layoutNodes: (msg.trackerData as any).layoutNodes || [],
              bindings: (msg.trackerData as any).bindings || {},
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
      }

      conversationContext = contextParts.join('\n\n') + '\n\n'
    }

    const hasMessages = Array.isArray(messages) && messages.length > 0
    const fullPrompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${hasMessages ? 'update or modify' : 'create'} the tracker according to the user's latest request.`
      : query

    const combinedSystemPrompt = `
      ${managerPrompt}
      
      ---
      
      ONCE YOU HAVE COMPLETED THE PRD, act as the "Builder Agent" and implement the technical schema.
      
      ${trackerBuilderPrompt}
      
      CRITICAL: You are a unified system. You MUST generate a response containing TWO parts:
      1. "manager": The breakdown of requirements.
      2. "tracker": The actual schema implementation.

      NEVER stop after the manager object. The user will see an error if 'tracker' is missing.
      You MUST populate the 'tracker' object based on the manager's PRD.
    `

    const result = streamObject({
      model: deepseek('deepseek-chat'),
      system: combinedSystemPrompt,
      prompt: fullPrompt,
      schema: multiAgentSchema,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('Error generating tracker:', message, error)
    return Response.json(
      { error: message || 'Failed to generate tracker. Please try again.' },
      { status: 500 },
    )
  }
}
