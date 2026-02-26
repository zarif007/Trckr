import { describe, expect, it, vi } from 'vitest'
import {
  compileDynamicOptionFunctionGraph,
  executeDynamicOptionFunction,
  resolveDynamicOptions,
  DYNAMIC_OPTIONS_ALL_OPERATORS,
  type DynamicOptionsContext,
} from '@/lib/dynamic-options'

function makeContext(overrides?: Partial<DynamicOptionsContext>): DynamicOptionsContext {
  return {
    grids: [
      {
        id: 'tasks_grid',
        name: 'Tasks',
        sectionId: 'main_section',
        placeId: 0,
        config: {},
      },
    ],
    fields: [
      {
        id: 'status',
        dataType: 'string',
        ui: { label: 'Status' },
        config: {},
      },
      {
        id: 'priority',
        dataType: 'number',
        ui: { label: 'Priority' },
        config: {},
      },
    ],
    layoutNodes: [
      { gridId: 'tasks_grid', fieldId: 'status' },
      { gridId: 'tasks_grid', fieldId: 'priority' },
    ],
    sections: [
      { id: 'main_section', tabId: 'overview_tab' },
    ],
    gridData: {
      tasks_grid: [
        { status: 'todo', priority: 3 },
        { status: 'doing', priority: 2 },
        { status: 'todo', priority: 1 },
      ],
    },
    dynamicOptions: {
      functions: {},
      connectors: {},
    },
    ...overrides,
  }
}

describe('dynamic options user functions', () => {
  it('resolves built-in functions with resolver precedence', async () => {
    const result = await resolveDynamicOptions({
      functionId: DYNAMIC_OPTIONS_ALL_OPERATORS,
      context: makeContext(),
    })

    expect(result.meta.source).toBe('builtin')
    expect(result.options.length).toBeGreaterThan(0)
    expect(result.options.some((o) => o.value === 'eq')).toBe(true)
  })

  it('resolves tracker-local grid_rows function with transforms', async () => {
    const context = makeContext({
      dynamicOptions: {
        functions: {
          status_options: {
            id: 'status_options',
            name: 'Status options',
            version: 1,
            source: { kind: 'grid_rows', gridId: 'tasks_grid' },
            transforms: [
              { kind: 'unique', by: 'status' },
              { kind: 'sort', by: 'status', direction: 'asc', valueType: 'string' },
            ],
            output: { label: 'status', value: 'status', id: 'status' },
            enabled: true,
            cache: { strategy: 'ttl', ttlSeconds: 60 },
          },
        },
        connectors: {},
      },
    })

    const result = await resolveDynamicOptions({
      functionId: 'status_options',
      context,
    })

    expect(result.meta.source).toBe('local_custom')
    expect(result.options.map((o) => o.value)).toEqual(['doing', 'todo'])
  })

  it('returns warning when remote execution is required but no remote resolver is provided', async () => {
    const context = makeContext({
      dynamicOptions: {
        functions: {
          currencies: {
            id: 'currencies',
            name: 'Currencies',
            version: 1,
            source: {
              kind: 'http_get',
              connectorId: 'countries_api',
              path: '/currencies',
              responsePath: 'items',
            },
            transforms: [],
            output: { label: 'code', value: 'code', id: 'code' },
            enabled: true,
          },
        },
        connectors: {
          countries_api: {
            id: 'countries_api',
            name: 'Countries API',
            type: 'rest',
            baseUrl: 'https://example.com',
            auth: { type: 'none' },
          },
        },
      },
    })

    const result = await resolveDynamicOptions({
      functionId: 'currencies',
      context,
    })

    expect(result.options).toEqual([])
    expect(result.warnings?.join(' ')).toContain('requires server execution')
  })

  it('resolves graph_v1 function from grid rows', async () => {
    const context = makeContext({
      dynamicOptions: {
        functions: {
          status_graph: {
            id: 'status_graph',
            name: 'Status graph',
            version: 1,
            engine: 'graph_v1',
            enabled: true,
            graph: {
              entryNodeId: 'start_1',
              returnNodeId: 'output_1',
              nodes: [
                { id: 'start_1', kind: 'control.start', position: { x: 0, y: 0 }, config: {} },
                {
                  id: 'source_1',
                  kind: 'source.grid_rows',
                  position: { x: 200, y: 0 },
                  config: { gridId: 'tasks_grid' },
                },
                {
                  id: 'unique_1',
                  kind: 'transform.unique',
                  position: { x: 400, y: 0 },
                  config: { by: 'status' },
                },
                {
                  id: 'output_1',
                  kind: 'output.options',
                  position: { x: 600, y: 0 },
                  config: { mapping: { label: 'status', value: 'status', id: 'status' } },
                },
              ],
              edges: [
                { id: 'e1', source: 'start_1', target: 'source_1' },
                { id: 'e2', source: 'source_1', target: 'unique_1' },
                { id: 'e3', source: 'unique_1', target: 'output_1' },
              ],
            },
          },
        },
        connectors: {},
      },
    })

    const result = await resolveDynamicOptions({
      functionId: 'status_graph',
      context,
    })

    expect(result.meta.source).toBe('local_custom')
    expect(result.options.map((o) => o.value).sort()).toEqual(['doing', 'todo'])
  })

  it('validates graph compile with missing return path', () => {
    const compile = compileDynamicOptionFunctionGraph({
      id: 'broken_graph',
      name: 'Broken graph',
      version: 1,
      engine: 'graph_v1',
      graph: {
        entryNodeId: 'start_1',
        returnNodeId: 'output_1',
        nodes: [
          { id: 'start_1', kind: 'control.start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'source_1',
            kind: 'source.grid_rows',
            position: { x: 200, y: 0 },
            config: { gridId: 'tasks_grid' },
          },
          {
            id: 'output_1',
            kind: 'output.options',
            position: { x: 600, y: 0 },
            config: { mapping: { label: 'status', value: 'status' } },
          },
        ],
        edges: [{ id: 'e1', source: 'start_1', target: 'source_1' }],
      },
    })

    expect(compile.ok).toBe(false)
    expect(compile.errors.some((issue) => issue.message.includes('reachable'))).toBe(true)
  })

  it('executes http_get source server-side with connector/secret auth', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      void url
      void init
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: [{ code: 'USD' }, { code: 'EUR' }] }),
      } as Response
    })

    const result = await executeDynamicOptionFunction({
      definition: {
        id: 'currencies',
        name: 'Currencies',
        version: 1,
        source: {
          kind: 'http_get',
          connectorId: 'countries_api',
          path: '/currencies',
          responsePath: 'items',
        },
        transforms: [{ kind: 'sort', by: 'code', direction: 'asc', valueType: 'string' }],
        output: { label: 'code', value: 'code', id: 'code' },
        enabled: true,
      },
      context: makeContext({
        dynamicOptions: {
          functions: {},
          connectors: {
            countries_api: {
              id: 'countries_api',
              name: 'Countries API',
              type: 'rest',
              baseUrl: 'https://example.com',
              auth: { type: 'secret_ref', secretRefId: 'COUNTRIES_API_KEY' },
              allowHosts: ['example.com'],
            },
          },
        },
      }),
      allowHttpGet: true,
      fetcher: fetcher as unknown as typeof fetch,
      secretResolver: () => 'abc123',
    })

    expect(result.requiresRemote).toBe(false)
    expect(result.warnings).toEqual([])
    expect(result.options.map((o) => o.value)).toEqual(['EUR', 'USD'])
    expect(fetcher).toHaveBeenCalledTimes(1)
    const fetchInit = fetcher.mock.calls[0]?.[1] as RequestInit | undefined
    expect((fetchInit?.headers as Record<string, string>).Authorization).toBe('Bearer abc123')
  })
})
