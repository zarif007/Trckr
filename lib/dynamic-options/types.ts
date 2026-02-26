/**
 * Shared types and constants for dynamic options (dynamic_select / dynamic_multiselect).
 */

import type { TrackerGrid, TrackerField } from '@/app/components/tracker-display/types'

/** Option shape returned by dynamic option functions (compatible with ResolvedOption in resolve-options). */
export interface DynamicOption {
  label: string
  value: unknown
  id?: string
  [key: string]: unknown
}

/** Layout node linking a field to a grid (subset of TrackerLayoutNode). */
export interface DynamicOptionsLayoutNode {
  gridId: string
  fieldId: string
}

/** Minimal section shape for resolving grid -> tab (id, tabId). */
export interface DynamicOptionsSection {
  id: string
  tabId: string
}

/** Runtime context for row-aware / field-aware option resolution. */
export interface DynamicOptionsRuntimeContext {
  currentGridId?: string
  currentFieldId?: string
  rowIndex?: number
  currentRow?: Record<string, unknown>
}

/** Context passed to dynamic option functions. */
export interface DynamicOptionsContext {
  grids: TrackerGrid[]
  fields: TrackerField[]
  /** Optional grid data for custom functions that resolve from rows. */
  gridData?: Record<string, Array<Record<string, unknown>>>
  /** When provided, all_field_paths only returns paths that exist in layout (grid.field on a grid). */
  layoutNodes?: DynamicOptionsLayoutNode[]
  /** When provided, all_field_paths excludes fields on sections with tabId === shared_tab. */
  sections?: DynamicOptionsSection[]
  /** Optional runtime values when resolving dynamic options for a specific field/row. */
  runtime?: DynamicOptionsRuntimeContext
  /** Optional tracker-level dynamic options definitions (user-created functions/connectors). */
  dynamicOptions?: DynamicOptionsDefinitions
}

/** Signature of a dynamic options function. */
export type DynamicOptionsFn = (
  context: DynamicOptionsContext
) => DynamicOption[]

/** Value selector used in DSL output mapping and map_fields transforms. */
export type DynamicValueSelector =
  | string
  | { const: unknown }
  | { fromArg: string }
  | { fromContext: string }

export type DynamicFilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'not_empty'

export interface DynamicFilterPredicate {
  field: string
  op: DynamicFilterOp
  value?: unknown
  valueFromArg?: string
  valueFromContext?: string
}

export type DynamicOptionSource =
  | {
    kind: 'builtin_ref'
    functionId: string
  }
  | {
    kind: 'grid_rows'
    gridId: string
  }
  | {
    kind: 'layout_fields'
    includeHidden?: boolean
    excludeSharedTab?: boolean
  }
  | {
    kind: 'http_get'
    connectorId: string
    path?: string
    query?: Record<string, string>
    headers?: Record<string, string>
    responsePath?: string
  }

export type DynamicOptionTransform =
  | {
    kind: 'filter'
    mode?: 'and' | 'or'
    predicates: DynamicFilterPredicate[]
  }
  | {
    kind: 'map_fields'
    mappings: Record<string, DynamicValueSelector>
  }
  | {
    kind: 'unique'
    by: string
  }
  | {
    kind: 'sort'
    by: string
    direction?: 'asc' | 'desc'
    valueType?: 'string' | 'number'
  }
  | {
    kind: 'limit'
    count: number
  }
  | {
    kind: 'flatten_path'
    path: string
  }

export interface DynamicOptionOutputMapping {
  label: DynamicValueSelector
  value: DynamicValueSelector
  id?: DynamicValueSelector
  extra?: Record<string, DynamicValueSelector>
}

export interface DynamicOptionFunctionCache {
  ttlSeconds?: number
  strategy?: 'ttl'
}

export interface DynamicOptionFunctionBase {
  id: string
  name: string
  description?: string
  version: number
  cache?: DynamicOptionFunctionCache
  enabled?: boolean
}

export interface DynamicOptionDslFunctionDef extends DynamicOptionFunctionBase {
  engine?: 'dsl_v1'
  source: DynamicOptionSource
  transforms?: DynamicOptionTransform[]
  output: DynamicOptionOutputMapping
}

export type DynamicGraphPortType = 'rows' | 'object' | 'options'

export interface DynamicGraphNodePosition {
  x: number
  y: number
}

export type DynamicFunctionNodeKind =
  | 'control.start'
  | 'source.grid_rows'
  | 'source.current_context'
  | 'source.layout_fields'
  | 'source.http_get'
  | 'transform.filter'
  | 'transform.map_fields'
  | 'transform.unique'
  | 'transform.sort'
  | 'transform.limit'
  | 'transform.flatten_path'
  | 'ai.extract_options'
  | 'output.options'

export interface DynamicFunctionGraphNodeBase {
  id: string
  kind: DynamicFunctionNodeKind
  position: DynamicGraphNodePosition
}

export interface DynamicFunctionGraphNodeStart extends DynamicFunctionGraphNodeBase {
  kind: 'control.start'
  config?: Record<string, never>
}

export interface DynamicFunctionGraphNodeSourceGridRows extends DynamicFunctionGraphNodeBase {
  kind: 'source.grid_rows'
  config: { gridId: string }
}

export interface DynamicFunctionGraphNodeSourceCurrentContext
  extends DynamicFunctionGraphNodeBase {
  kind: 'source.current_context'
  config?: {
    includeRowValues?: boolean
    includeFieldMetadata?: boolean
    includeLayoutMetadata?: boolean
  }
}

export interface DynamicFunctionGraphNodeSourceLayoutFields
  extends DynamicFunctionGraphNodeBase {
  kind: 'source.layout_fields'
  config?: {
    includeHidden?: boolean
    excludeSharedTab?: boolean
  }
}

export interface DynamicFunctionGraphNodeSourceHttpGet extends DynamicFunctionGraphNodeBase {
  kind: 'source.http_get'
  config: {
    connectorId: string
    path?: string
    query?: Record<string, string>
    headers?: Record<string, string>
    responsePath?: string
  }
}

/** Optional expression tree for filter condition (e.g. from ExprFlowBuilder). When set, executor evaluates per row; otherwise uses predicates. */
export type DynamicFilterExpr = import('@/lib/functions/types').ExprNode

export interface DynamicFunctionGraphNodeTransformFilter
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.filter'
  config: {
    mode?: 'and' | 'or'
    predicates: DynamicFilterPredicate[]
    /** When set, rows are kept when this expression evaluates to truthy (row as rowValues). */
    expr?: DynamicFilterExpr
  }
}

export interface DynamicFunctionGraphNodeTransformMapFields
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.map_fields'
  config: { mappings: Record<string, DynamicValueSelector> }
}

export interface DynamicFunctionGraphNodeTransformUnique
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.unique'
  config: { by: string }
}

export interface DynamicFunctionGraphNodeTransformSort
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.sort'
  config: {
    by: string
    direction?: 'asc' | 'desc'
    valueType?: 'string' | 'number'
  }
}

export interface DynamicFunctionGraphNodeTransformLimit
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.limit'
  config: { count: number }
}

export interface DynamicFunctionGraphNodeTransformFlattenPath
  extends DynamicFunctionGraphNodeBase {
  kind: 'transform.flatten_path'
  config: { path: string }
}

export interface DynamicFunctionGraphNodeAiExtractOptions
  extends DynamicFunctionGraphNodeBase {
  kind: 'ai.extract_options'
  config: {
    prompt: string
    inputPath?: string
    maxRows?: number
  }
}

export interface DynamicFunctionGraphNodeOutputOptions
  extends DynamicFunctionGraphNodeBase {
  kind: 'output.options'
  config: {
    mapping: DynamicOptionOutputMapping
  }
}

export type DynamicFunctionGraphNode =
  | DynamicFunctionGraphNodeStart
  | DynamicFunctionGraphNodeSourceGridRows
  | DynamicFunctionGraphNodeSourceCurrentContext
  | DynamicFunctionGraphNodeSourceLayoutFields
  | DynamicFunctionGraphNodeSourceHttpGet
  | DynamicFunctionGraphNodeTransformFilter
  | DynamicFunctionGraphNodeTransformMapFields
  | DynamicFunctionGraphNodeTransformUnique
  | DynamicFunctionGraphNodeTransformSort
  | DynamicFunctionGraphNodeTransformLimit
  | DynamicFunctionGraphNodeTransformFlattenPath
  | DynamicFunctionGraphNodeAiExtractOptions
  | DynamicFunctionGraphNodeOutputOptions

export interface DynamicFunctionGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface DynamicFunctionGraphDef {
  nodes: DynamicFunctionGraphNode[]
  edges: DynamicFunctionGraphEdge[]
  entryNodeId: string
  returnNodeId: string
}

export interface DynamicOptionGraphFunctionDef extends DynamicOptionFunctionBase {
  engine: 'graph_v1'
  graph: DynamicFunctionGraphDef
}

export type DynamicOptionFunctionDef =
  | DynamicOptionDslFunctionDef
  | DynamicOptionGraphFunctionDef

export interface DynamicAiExtractInput {
  prompt: string
  input: unknown
  maxRows: number
}

export type DynamicAiExtractor = (
  input: DynamicAiExtractInput
) => Promise<Array<Record<string, unknown>>>

export interface DynamicOptionCompileIssue {
  message: string
  nodeId?: string
  edgeId?: string
}

export interface CompiledDynamicFunctionPlan {
  functionId: string
  engine: 'graph_v1'
  executionOrder: string[]
  nodesById: Map<string, DynamicFunctionGraphNode>
  incomingByNodeId: Map<string, DynamicFunctionGraphEdge[]>
  outgoingByNodeId: Map<string, DynamicFunctionGraphEdge[]>
  requiresRemote: boolean
  usesRuntimeRow: boolean
}

export interface CompileDynamicFunctionGraphResult {
  ok: boolean
  plan?: CompiledDynamicFunctionPlan
  errors: DynamicOptionCompileIssue[]
}

export interface DynamicConnectorAuthNone {
  type: 'none'
}

export interface DynamicConnectorAuthSecretRef {
  type: 'secret_ref'
  secretRefId: string
}

export type DynamicConnectorAuth =
  | DynamicConnectorAuthNone
  | DynamicConnectorAuthSecretRef

export interface DynamicConnectorDef {
  id: string
  name: string
  type: 'rest'
  baseUrl: string
  auth: DynamicConnectorAuth
  defaultHeaders?: Record<string, string>
  allowHosts?: string[]
}

export interface DynamicOptionsDefinitions {
  functions?: Record<string, DynamicOptionFunctionDef>
  connectors?: Record<string, DynamicConnectorDef>
}

export interface DynamicOptionsExecutionMeta {
  fromCache: boolean
  fetchedAt: string
  expiresAt?: string
  durationMs: number
  source: 'builtin' | 'local_custom' | 'remote_custom' | 'unknown'
}

export interface DynamicOptionsResolveResult {
  options: DynamicOption[]
  meta: DynamicOptionsExecutionMeta
  warnings?: string[]
}

export interface DynamicOptionsResolveInput {
  functionId: string
  context: DynamicOptionsContext
  runtime?: DynamicOptionsRuntimeContext
  args?: Record<string, unknown>
  forceRefresh?: boolean
  cacheTtlSecondsOverride?: number
  /** Internal/server flag: allow executing server-only nodes directly. */
  allowHttpGet?: boolean
  /** Optional secret resolver used by server-side http_get execution. */
  secretResolver?: (secretRefId: string) => Promise<string | undefined> | string | undefined
  /** Optional AI extractor used by server-side ai.extract_options execution. */
  aiExtractor?: DynamicAiExtractor
  /** Optional remote resolver for functions that need server execution (e.g. http_get). */
  remoteResolver?: (payload: {
    functionId: string
    args?: Record<string, unknown>
    context: DynamicOptionsContext
    runtime?: DynamicOptionsRuntimeContext
    forceRefresh?: boolean
    cacheTtlSecondsOverride?: number
  }) => Promise<DynamicOptionsResolveResult>
}

/** Built-in function ids. Add new ids here when adding new functions. */
export const DYNAMIC_OPTIONS_ALL_FIELD_PATHS = 'all_field_paths'
export const DYNAMIC_OPTIONS_ALL_OPERATORS = 'all_operators'
export const DYNAMIC_OPTIONS_ALL_ACTIONS = 'all_actions'
export const DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES = 'all_rule_set_values'

export const KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS = [
  DYNAMIC_OPTIONS_ALL_FIELD_PATHS,
  DYNAMIC_OPTIONS_ALL_OPERATORS,
  DYNAMIC_OPTIONS_ALL_ACTIONS,
  DYNAMIC_OPTIONS_ALL_RULE_SET_VALUES,
] as const

export type KnownDynamicOptionsFunctionId =
  (typeof KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS)[number]

/** Pipeline AST: linear source → transforms → output. Used for validation, explain, and round-trip with graph. */
export type DynamicPipelineSourceStep =
  | { kind: 'source.grid_rows'; config: { gridId: string } }
  | { kind: 'source.current_context'; config?: { includeRowValues?: boolean; includeFieldMetadata?: boolean; includeLayoutMetadata?: boolean } }
  | { kind: 'source.layout_fields'; config?: { includeHidden?: boolean; excludeSharedTab?: boolean } }
  | {
    kind: 'source.http_get'
    config: {
      connectorId: string
      path?: string
      query?: Record<string, string>
      headers?: Record<string, string>
      responsePath?: string
    }
  }

export type DynamicPipelineTransformStep =
  | {
    kind: 'transform.filter'
    config: {
      mode?: 'and' | 'or'
      predicates: DynamicFilterPredicate[]
      expr?: DynamicFilterExpr
    }
  }
  | { kind: 'transform.map_fields'; config: { mappings: Record<string, DynamicValueSelector> } }
  | { kind: 'transform.unique'; config: { by: string } }
  | {
    kind: 'transform.sort'
    config: { by: string; direction?: 'asc' | 'desc'; valueType?: 'string' | 'number' }
  }
  | { kind: 'transform.limit'; config: { count: number } }
  | { kind: 'transform.flatten_path'; config: { path: string } }
  | {
    kind: 'ai.extract_options'
    config: { prompt: string; inputPath?: string; maxRows?: number }
  }

export interface DynamicPipelineAst {
  source: DynamicPipelineSourceStep
  steps: DynamicPipelineTransformStep[]
  output: DynamicOptionOutputMapping
}
