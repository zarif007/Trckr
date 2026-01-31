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
              gridData,
            } = msg.trackerData

            // Create a clean, minimal JSON summary of the current tracker state
            const currentTrackerState = {
              tabs: tabs.map((t: any) => ({
                name: t.name,
                id: t.fieldName,
                placeId: t.placeId,
              })),
              sections: sections.map((s: any) => ({
                name: s.name,
                id: s.fieldName,
                tab: s.tabId,
                placeId: s.placeId,
              })),
              grids: grids.map((g: any) => ({
                name: g.name,
                id: g.id,
                key: g.key,
                type: g.type,
                section: g.sectionId,
                placeId: g.placeId,
                isShadow: g.isShadow,
                gridId: g.gridId,
                config: g.config,
              })),
              fields: fields.map((f: any) => ({
                id: f.id,
                key: f.key,
                dataType: f.dataType,
                gridId: f.gridId,
                placeId: f.placeId,
                label: f.ui?.label,
                optionsMappingId: f.config?.optionsMappingId,
                options: f.config?.options,
              })),
              gridDataKeys: gridData ? Object.keys(gridData) : [],
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
      
      CRITICAL: You are a unified system. First fill the "manager" object thoroughly. 
      Only then proceed to fill the "tracker" object based on your PRD.
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
