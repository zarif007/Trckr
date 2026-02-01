import managerPrompt from '@/constants/systemPrompts/manager'
import trackerBuilderPrompt from '@/constants/systemPrompts/trackerBuilder'
import { multiAgentSchema } from '@/lib/schemas/multi-agent'
import { deepseek } from '@ai-sdk/deepseek'
import { streamObject } from 'ai'

export async function POST(request: Request) {
  try {
    const { query, messages } = await request.json()

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Query is required' }, { status: 400 })
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
                config: f.config ?? {}, // validations (min, max, minLength, maxLength), isRequired, isDisabled, isHidden, optionsMappingId, etc.
              })),
              layoutNodes: (msg.trackerData as any).layoutNodes || [],
              optionTables: (msg.trackerData as any).optionTables || [],
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

    const fullPrompt = conversationContext
      ? `${conversationContext}User: ${query}\n\nBased on our conversation, ${messages && messages.length > 0 ? 'update or modify' : 'create'} the tracker according to the user's latest request.`
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
    console.error('Error generating tracker:', error)
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate tracker',
      },
      { status: 500 },
    )
  }
}
