import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

export const dynamicValueSelectorSchema = z.union([
  z.string(),
  z.object({ const: z.any() }).strict(),
  z.object({ fromArg: nonEmptyString }).strict(),
  z.object({ fromContext: nonEmptyString }).strict(),
])

export const dynamicFilterOpSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'not_empty',
])

export const dynamicFilterPredicateSchema = z
  .object({
    field: nonEmptyString,
    op: dynamicFilterOpSchema,
    value: z.any().optional(),
    valueFromArg: nonEmptyString.optional(),
    valueFromContext: nonEmptyString.optional(),
  })
  .strict()

export const dynamicOptionSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('builtin_ref'),
      functionId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('grid_rows'),
      gridId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('layout_fields'),
      includeHidden: z.boolean().optional(),
      excludeSharedTab: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('http_get'),
      connectorId: nonEmptyString,
      path: z.string().optional(),
      query: z.record(z.string(), z.string()).optional(),
      headers: z.record(z.string(), z.string()).optional(),
      responsePath: z.string().optional(),
    })
    .strict(),
])

export const dynamicOptionTransformSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('filter'),
      mode: z.enum(['and', 'or']).optional(),
      predicates: z.array(dynamicFilterPredicateSchema).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal('map_fields'),
      mappings: z.record(z.string(), dynamicValueSelectorSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal('unique'),
      by: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal('sort'),
      by: nonEmptyString,
      direction: z.enum(['asc', 'desc']).optional(),
      valueType: z.enum(['string', 'number']).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('limit'),
      count: z.coerce.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('flatten_path'),
      path: nonEmptyString,
    })
    .strict(),
])

export const dynamicOptionOutputMappingSchema = z
  .object({
    label: dynamicValueSelectorSchema,
    value: dynamicValueSelectorSchema,
    id: dynamicValueSelectorSchema.optional(),
    extra: z.record(z.string(), dynamicValueSelectorSchema).optional(),
  })
  .strict()

const dynamicOptionCacheSchema = z
  .object({
    ttlSeconds: z.coerce.number().int().positive().optional(),
    strategy: z.enum(['ttl']).optional(),
  })
  .strict()
  .optional()

const dynamicOptionFunctionBaseSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    version: z.coerce.number().int().min(1).default(1),
    cache: dynamicOptionCacheSchema,
    enabled: z.boolean().optional(),
  })
  .strict()

export const dynamicFunctionGraphNodePositionSchema = z
  .object({
    x: z.coerce.number(),
    y: z.coerce.number(),
  })
  .strict()

export const dynamicFunctionGraphNodeSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('control.start'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({}).strict().optional(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('source.grid_rows'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({ gridId: nonEmptyString }).strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('source.current_context'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          includeRowValues: z.boolean().optional(),
          includeFieldMetadata: z.boolean().optional(),
          includeLayoutMetadata: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('source.layout_fields'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          includeHidden: z.boolean().optional(),
          excludeSharedTab: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('source.http_get'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          connectorId: nonEmptyString,
          path: z.string().optional(),
          query: z.record(z.string(), z.string()).optional(),
          headers: z.record(z.string(), z.string()).optional(),
          responsePath: z.string().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.filter'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          mode: z.enum(['and', 'or']).optional(),
          predicates: z.array(dynamicFilterPredicateSchema).default([]),
          expr: z.any().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.map_fields'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          mappings: z.record(z.string(), dynamicValueSelectorSchema),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.unique'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({ by: nonEmptyString }).strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.sort'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          by: nonEmptyString,
          direction: z.enum(['asc', 'desc']).optional(),
          valueType: z.enum(['string', 'number']).optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.limit'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({ count: z.coerce.number().int().positive() }).strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('transform.flatten_path'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({ path: nonEmptyString }).strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('ai.extract_options'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z
        .object({
          prompt: nonEmptyString,
          inputPath: z.string().optional(),
          maxRows: z.coerce.number().int().positive().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      id: nonEmptyString,
      kind: z.literal('output.options'),
      position: dynamicFunctionGraphNodePositionSchema,
      config: z.object({ mapping: dynamicOptionOutputMappingSchema }).strict(),
    })
    .strict(),
])

export const dynamicFunctionGraphEdgeSchema = z
  .object({
    id: nonEmptyString,
    source: nonEmptyString,
    target: nonEmptyString,
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
  })
  .strict()

export const dynamicFunctionGraphSchema = z
  .object({
    nodes: z.array(dynamicFunctionGraphNodeSchema).default([]),
    edges: z.array(dynamicFunctionGraphEdgeSchema).default([]),
    entryNodeId: nonEmptyString,
    returnNodeId: nonEmptyString,
  })
  .strict()
  .superRefine((graph, ctx) => {
    const nodeIds = new Set(graph.nodes.map((node) => node.id))
    if (!nodeIds.has(graph.entryNodeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entryNodeId'],
        message: 'entryNodeId must match an existing node id',
      })
    }
    if (!nodeIds.has(graph.returnNodeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnNodeId'],
        message: 'returnNodeId must match an existing node id',
      })
    }
    const returnNode = graph.nodes.find((node) => node.id === graph.returnNodeId)
    if (returnNode && returnNode.kind !== 'output.options') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnNodeId'],
        message: 'returnNodeId must reference an output.options node',
      })
    }
  })

export const dynamicOptionFunctionDslSchema = dynamicOptionFunctionBaseSchema
  .extend({
    engine: z.literal('dsl_v1').optional(),
    source: dynamicOptionSourceSchema,
    transforms: z.array(dynamicOptionTransformSchema).optional(),
    output: dynamicOptionOutputMappingSchema,
  })
  .strict()

export const dynamicOptionFunctionGraphSchema = dynamicOptionFunctionBaseSchema
  .extend({
    engine: z.literal('graph_v1'),
    graph: dynamicFunctionGraphSchema,
  })
  .strict()

export const dynamicOptionFunctionSchema = z.union([
  dynamicOptionFunctionGraphSchema,
  dynamicOptionFunctionDslSchema,
])

export const dynamicConnectorSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    type: z.literal('rest'),
    baseUrl: z.string().url(),
    auth: z.discriminatedUnion('type', [
      z.object({ type: z.literal('none') }).strict(),
      z.object({ type: z.literal('secret_ref'), secretRefId: nonEmptyString }).strict(),
    ]),
    defaultHeaders: z.record(z.string(), z.string()).optional(),
    allowHosts: z.array(nonEmptyString).optional(),
  })
  .strict()

export const dynamicOptionsDefinitionsSchema = z
  .object({
    functions: z.record(z.string(), dynamicOptionFunctionSchema).optional(),
    connectors: z.record(z.string(), dynamicConnectorSchema).optional(),
  })
  .strict()

export const generateDynamicOptionFunctionOutputSchema = z
  .object({
    function: dynamicOptionFunctionSchema,
  })
  .strict()

export type DynamicOptionFunctionSchema = z.infer<typeof dynamicOptionFunctionSchema>
export type DynamicConnectorSchema = z.infer<typeof dynamicConnectorSchema>
export type DynamicOptionsDefinitionsSchema = z.infer<typeof dynamicOptionsDefinitionsSchema>
