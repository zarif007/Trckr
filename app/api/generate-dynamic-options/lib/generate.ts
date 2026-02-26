import { deepseek } from '@ai-sdk/deepseek'
import { generateObject } from 'ai'
import {
  dynamicOptionFunctionSchema,
  generateDynamicOptionFunctionOutputSchema,
} from '@/lib/dynamic-options'
import { buildSystemPrompt, buildUserPrompt } from './prompts'

interface GenerateDynamicOptionsInput {
  prompt: string
  functionId: string
  functionName: string
  currentTracker: unknown
  sampleResponse?: unknown
}

function firstGridId(currentTracker: unknown): string {
  if (!currentTracker || typeof currentTracker !== 'object' || Array.isArray(currentTracker)) {
    return 'main_grid'
  }
  const grids = (currentTracker as { grids?: Array<{ id?: string }> }).grids ?? []
  const id = grids[0]?.id
  return typeof id === 'string' && id.trim() ? id : 'main_grid'
}

function firstFieldId(currentTracker: unknown): string {
  if (!currentTracker || typeof currentTracker !== 'object' || Array.isArray(currentTracker)) {
    return 'value'
  }
  const fields = (currentTracker as { fields?: Array<{ id?: string }> }).fields ?? []
  const id = fields[0]?.id
  return typeof id === 'string' && id.trim() ? id : 'value'
}

function toGraphFallback(
  input: GenerateDynamicOptionsInput,
  maybeFunction: Record<string, unknown>,
) {
  const gridId = firstGridId(input.currentTracker)
  const fieldId = firstFieldId(input.currentTracker)
  const outputMapping =
    maybeFunction.output && typeof maybeFunction.output === 'object'
      ? maybeFunction.output
      : { label: fieldId, value: fieldId, id: fieldId }

  return {
    id: input.functionId,
    name: input.functionName,
    description:
      typeof maybeFunction.description === 'string'
        ? maybeFunction.description
        : undefined,
    version: 1,
    engine: 'graph_v1' as const,
    enabled: maybeFunction.enabled !== false,
    cache:
      maybeFunction.cache && typeof maybeFunction.cache === 'object'
        ? maybeFunction.cache
        : { strategy: 'ttl', ttlSeconds: 300 },
    graph: {
      entryNodeId: 'start_1',
      returnNodeId: 'output_1',
      nodes: [
        { id: 'start_1', kind: 'control.start', position: { x: 40, y: 160 }, config: {} },
        { id: 'source_1', kind: 'source.grid_rows', position: { x: 300, y: 160 }, config: { gridId } },
        { id: 'output_1', kind: 'output.options', position: { x: 560, y: 160 }, config: { mapping: outputMapping } },
      ],
      edges: [
        { id: 'e_start_source', source: 'start_1', target: 'source_1' },
        { id: 'e_source_output', source: 'source_1', target: 'output_1' },
      ],
    },
  }
}

export async function generateDynamicOptionFunction(
  input: GenerateDynamicOptionsInput,
) {
  const system = buildSystemPrompt()
  const prompt = buildUserPrompt(input)

  const { object } = await generateObject({
    model: deepseek('deepseek-chat'),
    system,
    prompt,
    schema: generateDynamicOptionFunctionOutputSchema,
    maxOutputTokens: 1400,
  })

  const normalized = {
    ...object.function,
    id: input.functionId,
    name: input.functionName,
    version: 1,
    enabled: object.function.enabled ?? true,
  }

  const maybeFunction =
    normalized && typeof normalized === 'object' && !Array.isArray(normalized)
      ? (normalized as Record<string, unknown>)
      : {}
  const graphFirst =
    maybeFunction.engine === 'graph_v1'
      ? maybeFunction
      : toGraphFallback(input, maybeFunction)

  const parsed = dynamicOptionFunctionSchema.parse(graphFirst)
  return { function: parsed }
}
