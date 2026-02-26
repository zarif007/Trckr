import type {
  DynamicConnectorDef,
  DynamicFunctionGraphDef,
  DynamicFunctionGraphNode,
  DynamicFunctionNodeKind,
  DynamicOptionFunctionDef,
  DynamicOptionGraphFunctionDef,
} from '@/lib/dynamic-options'
import type { TrackerDisplayProps } from '../../types'

export interface DynamicNodePaletteItem {
  kind: DynamicFunctionNodeKind
  title: string
  subtitle: string
  group: 'Control' | 'Source' | 'Transform' | 'AI'
}

export const DYNAMIC_NODE_PALETTE: DynamicNodePaletteItem[] = [
  {
    kind: 'control.start',
    title: 'Start',
    subtitle: 'Entry point of the flow',
    group: 'Control',
  },
  {
    kind: 'output.options',
    title: 'Return options',
    subtitle: 'Map rows to option list',
    group: 'Control',
  },
  {
    kind: 'source.grid_rows',
    title: 'Grid rows',
    subtitle: 'Read rows from a grid',
    group: 'Source',
  },
  {
    kind: 'source.current_context',
    title: 'Current fields',
    subtitle: 'Current row + field metadata',
    group: 'Source',
  },
  {
    kind: 'source.layout_fields',
    title: 'Layout fields',
    subtitle: 'Field metadata stream',
    group: 'Source',
  },
  {
    kind: 'source.http_get',
    title: 'External API',
    subtitle: 'Fetch from REST endpoint',
    group: 'Source',
  },
  {
    kind: 'transform.filter',
    title: 'Filter',
    subtitle: 'Keep rows by conditions',
    group: 'Transform',
  },
  {
    kind: 'transform.map_fields',
    title: 'Map fields',
    subtitle: 'Create/override fields',
    group: 'Transform',
  },
  {
    kind: 'transform.unique',
    title: 'Unique',
    subtitle: 'Remove duplicates',
    group: 'Transform',
  },
  {
    kind: 'transform.sort',
    title: 'Sort',
    subtitle: 'Order rows',
    group: 'Transform',
  },
  {
    kind: 'transform.limit',
    title: 'Limit',
    subtitle: 'Keep first N rows',
    group: 'Transform',
  },
  {
    kind: 'transform.flatten_path',
    title: 'Flatten path',
    subtitle: 'Extract nested array',
    group: 'Transform',
  },
  {
    kind: 'ai.extract_options',
    title: 'LLM extractor',
    subtitle: 'Extract options with AI',
    group: 'AI',
  },
]

export function nodeKindLabel(kind: DynamicFunctionNodeKind): string {
  switch (kind) {
    case 'control.start':
      return 'Start'
    case 'source.grid_rows':
      return 'Grid rows'
    case 'source.current_context':
      return 'Current fields'
    case 'source.layout_fields':
      return 'Layout fields'
    case 'source.http_get':
      return 'External API'
    case 'transform.filter':
      return 'Filter'
    case 'transform.map_fields':
      return 'Map fields'
    case 'transform.unique':
      return 'Unique'
    case 'transform.sort':
      return 'Sort'
    case 'transform.limit':
      return 'Limit'
    case 'transform.flatten_path':
      return 'Flatten path'
    case 'ai.extract_options':
      return 'LLM extractor'
    case 'output.options':
      return 'Return options'
    default:
      return kind
  }
}

function fallbackGridId(schema: TrackerDisplayProps): string {
  return schema.grids[0]?.id ?? 'main_grid'
}

function fallbackFieldId(schema: TrackerDisplayProps): string {
  return schema.fields[0]?.id ?? 'value'
}

/** Internal templates for backward compat when converting DSL to graph; not exposed in UI. */
type InternalTemplate = 'grid_values' | 'current_row' | 'external_api' | 'ai_from_api'

export function buildDefaultGraph(
  schema: TrackerDisplayProps,
  template: InternalTemplate = 'grid_values',
  connectors?: Record<string, DynamicConnectorDef>,
): DynamicFunctionGraphDef {
  const firstGrid = fallbackGridId(schema)
  const firstField = fallbackFieldId(schema)
  const firstConnector = Object.keys(connectors ?? {})[0] ?? 'api_connector'

  if (template === 'current_row') {
    return {
      entryNodeId: 'start_1',
      returnNodeId: 'output_1',
      nodes: [
        { id: 'start_1', kind: 'control.start', position: { x: 40, y: 160 }, config: {} },
        {
          id: 'source_context_1',
          kind: 'source.current_context',
          position: { x: 280, y: 160 },
          config: {
            includeRowValues: true,
            includeFieldMetadata: true,
            includeLayoutMetadata: false,
          },
        },
        {
          id: 'map_1',
          kind: 'transform.map_fields',
          position: { x: 520, y: 160 },
          config: {
            mappings: {
              label: 'row.' + firstField,
              value: 'row.' + firstField,
            },
          },
        },
        {
          id: 'output_1',
          kind: 'output.options',
          position: { x: 760, y: 160 },
          config: {
            mapping: {
              label: 'label',
              value: 'value',
              id: 'value',
            },
          },
        },
      ],
      edges: [
        { id: 'e_start_ctx', source: 'start_1', target: 'source_context_1' },
        { id: 'e_ctx_map', source: 'source_context_1', target: 'map_1' },
        { id: 'e_map_out', source: 'map_1', target: 'output_1' },
      ],
    }
  }

  if (template === 'external_api') {
    return {
      entryNodeId: 'start_1',
      returnNodeId: 'output_1',
      nodes: [
        { id: 'start_1', kind: 'control.start', position: { x: 40, y: 160 }, config: {} },
        {
          id: 'http_1',
          kind: 'source.http_get',
          position: { x: 280, y: 160 },
          config: {
            connectorId: firstConnector,
            path: '/',
            responsePath: 'items',
          },
        },
        {
          id: 'flatten_1',
          kind: 'transform.flatten_path',
          position: { x: 520, y: 160 },
          config: { path: 'items' },
        },
        {
          id: 'output_1',
          kind: 'output.options',
          position: { x: 760, y: 160 },
          config: {
            mapping: {
              label: 'name',
              value: 'value',
              id: 'value',
            },
          },
        },
      ],
      edges: [
        { id: 'e_start_http', source: 'start_1', target: 'http_1' },
        { id: 'e_http_flatten', source: 'http_1', target: 'flatten_1' },
        { id: 'e_flatten_out', source: 'flatten_1', target: 'output_1' },
      ],
    }
  }

  if (template === 'ai_from_api') {
    return {
      entryNodeId: 'start_1',
      returnNodeId: 'output_1',
      nodes: [
        { id: 'start_1', kind: 'control.start', position: { x: 40, y: 160 }, config: {} },
        {
          id: 'http_1',
          kind: 'source.http_get',
          position: { x: 280, y: 160 },
          config: {
            connectorId: firstConnector,
            path: '/',
          },
        },
        {
          id: 'ai_1',
          kind: 'ai.extract_options',
          position: { x: 520, y: 160 },
          config: {
            prompt: 'Extract option rows with keys label and value',
            maxRows: 200,
          },
        },
        {
          id: 'output_1',
          kind: 'output.options',
          position: { x: 760, y: 160 },
          config: {
            mapping: {
              label: 'label',
              value: 'value',
              id: 'value',
            },
          },
        },
      ],
      edges: [
        { id: 'e_start_http', source: 'start_1', target: 'http_1' },
        { id: 'e_http_ai', source: 'http_1', target: 'ai_1' },
        { id: 'e_ai_out', source: 'ai_1', target: 'output_1' },
      ],
    }
  }

  return {
    entryNodeId: 'start_1',
    returnNodeId: 'output_1',
    nodes: [
      { id: 'start_1', kind: 'control.start', position: { x: 40, y: 160 }, config: {} },
      {
        id: 'source_grid_1',
        kind: 'source.grid_rows',
        position: { x: 280, y: 160 },
        config: { gridId: firstGrid },
      },
      {
        id: 'output_1',
        kind: 'output.options',
        position: { x: 520, y: 160 },
        config: {
          mapping: {
            label: firstField,
            value: firstField,
            id: firstField,
          },
        },
      },
    ],
    edges: [
      { id: 'e_start_grid', source: 'start_1', target: 'source_grid_1' },
      { id: 'e_grid_out', source: 'source_grid_1', target: 'output_1' },
    ],
  }
}

export function ensureGraphFunction(
  functionDef: DynamicOptionFunctionDef,
  schema: TrackerDisplayProps,
  connectors?: Record<string, DynamicConnectorDef>,
): DynamicOptionGraphFunctionDef {
  if (functionDef.engine === 'graph_v1') return functionDef

  const fallback = buildDefaultGraph(schema, 'grid_values', connectors)
  const nodes: DynamicFunctionGraphNode[] = [...fallback.nodes]

  if (functionDef.source.kind === 'grid_rows') {
    const source = nodes.find((node) => node.kind === 'source.grid_rows')
    if (source && source.kind === 'source.grid_rows') {
      source.config.gridId = functionDef.source.gridId
    }
  }

  if (functionDef.source.kind === 'layout_fields') {
    nodes.splice(1, 1, {
      id: 'source_layout_1',
      kind: 'source.layout_fields',
      position: { x: 280, y: 160 },
      config: {
        includeHidden: functionDef.source.includeHidden,
        excludeSharedTab: functionDef.source.excludeSharedTab,
      },
    })
    return {
      ...functionDef,
      engine: 'graph_v1',
      graph: {
        ...fallback,
        nodes,
        edges: [
          { id: 'e_start_layout', source: 'start_1', target: 'source_layout_1' },
          { id: 'e_layout_out', source: 'source_layout_1', target: 'output_1' },
        ],
      },
    }
  }

  if (functionDef.source.kind === 'http_get') {
    return {
      ...functionDef,
      engine: 'graph_v1',
      graph: buildDefaultGraph(schema, 'external_api', connectors),
    }
  }

  if (functionDef.source.kind === 'builtin_ref') {
    return {
      ...functionDef,
      engine: 'graph_v1',
      graph: {
        ...fallback,
        nodes: [
          ...fallback.nodes,
          {
            id: 'map_1',
            kind: 'transform.map_fields',
            position: { x: 400, y: 320 },
            config: {
              mappings: {
                label: 'label',
                value: 'value',
                id: 'id',
              },
            },
          },
        ],
      },
    }
  }

  return {
    ...functionDef,
    engine: 'graph_v1',
    graph: {
      ...fallback,
      nodes: fallback.nodes.map((node) => {
        if (node.kind === 'output.options') {
          return {
            ...node,
            config: {
              mapping: functionDef.output,
            },
          }
        }
        return node
      }),
    },
  }
}

export function createTemplateGraphFunction(
  id: string,
  name: string,
  schema: TrackerDisplayProps,
  template: 'grid_values' | 'current_row',
  connectors?: Record<string, DynamicConnectorDef>,
): DynamicOptionGraphFunctionDef {
  return {
    id,
    name,
    version: 1,
    engine: 'graph_v1',
    enabled: true,
    cache: { strategy: 'ttl', ttlSeconds: 300 },
    graph: buildDefaultGraph(schema, template, connectors),
  }
}

export function summarizeGraph(functionDef: DynamicOptionGraphFunctionDef): string {
  const nodeById = new Map(functionDef.graph.nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  for (const edge of functionDef.graph.edges) {
    const list = outgoing.get(edge.source) ?? []
    list.push(edge.target)
    outgoing.set(edge.source, list)
  }

  const visited = new Set<string>()
  const sequence: string[] = []
  const stack = [functionDef.graph.entryNodeId]
  while (stack.length > 0) {
    const id = stack.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodeById.get(id)
    if (node) sequence.push(nodeKindLabel(node.kind))
    for (const nextId of outgoing.get(id) ?? []) {
      stack.push(nextId)
    }
  }

  return sequence.join(' -> ')
}
