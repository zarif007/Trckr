import { compareValues } from '@/lib/depends-on/compare'
import { evaluateExpr } from '@/lib/functions/evaluator'
import type { ExprNode } from '@/lib/functions/types'
import type {
  DynamicAiExtractInput,
  DynamicConnectorDef,
  DynamicFilterPredicate,
  DynamicFunctionGraphNode,
  DynamicOption,
  DynamicOptionFunctionDef,
  DynamicOptionGraphFunctionDef,
  DynamicOptionOutputMapping,
  DynamicOptionsContext,
  DynamicValueSelector,
} from '../types'
import { getByPath, isRecord, toPlainString, toRecord, toStableKey } from './path'
import { compileDynamicOptionFunctionGraph } from './graph'

export interface ExecuteDynamicFunctionOptions {
  definition: DynamicOptionFunctionDef
  context: DynamicOptionsContext
  args?: Record<string, unknown>
  resolveBuiltIn?: (functionId: string, context: DynamicOptionsContext) => DynamicOption[]
  connectors?: Record<string, DynamicConnectorDef>
  allowHttpGet?: boolean
  fetcher?: typeof fetch
  timeoutMs?: number
  maxItems?: number
  secretResolver?: (secretRefId: string) => Promise<string | undefined> | string | undefined
  aiExtractor?: (input: DynamicAiExtractInput) => Promise<Array<Record<string, unknown>>>
}

export interface ExecuteDynamicFunctionResult {
  options: DynamicOption[]
  warnings: string[]
  requiresRemote: boolean
  source: 'builtin' | 'local_custom' | 'remote_custom'
}

function isGraphFunction(definition: DynamicOptionFunctionDef): definition is DynamicOptionGraphFunctionDef {
  return definition.engine === 'graph_v1'
}

function readSelector(
  selector: DynamicValueSelector,
  row: Record<string, unknown>,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): unknown {
  if (typeof selector === 'string') return getByPath(row, selector)
  if ('const' in selector) return selector.const
  if ('fromArg' in selector) return args[selector.fromArg]
  if ('fromContext' in selector) return getByPath(context, selector.fromContext)
  return undefined
}

function normalizeRows(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return []
  return input.map((item) => (isRecord(item) ? item : { value: item }))
}

function resolvePredicateExpected(
  predicate: DynamicFilterPredicate,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): unknown {
  if (predicate.valueFromArg) return args[predicate.valueFromArg]
  if (predicate.valueFromContext) return getByPath(context, predicate.valueFromContext)
  return predicate.value
}

function getLastPathSegment(path: string): string {
  const parts = path.split('.').filter(Boolean)
  return parts[parts.length - 1] ?? 'value'
}

function applyFilterTransform(
  rows: Record<string, unknown>[],
  config: {
    mode?: 'and' | 'or'
    predicates: DynamicFilterPredicate[]
    expr?: ExprNode
  },
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): Record<string, unknown>[] {
  if (config.expr != null && typeof config.expr === 'object' && 'op' in config.expr) {
    const expr = config.expr as ExprNode
    return rows.filter((row) => {
      const result = evaluateExpr(expr, {
        rowValues: row as Record<string, unknown>,
        fieldId: '',
        fieldConfig: null,
      })
      return Boolean(result)
    })
  }
  const mode = config.mode ?? 'and'
  return rows.filter((row) => {
    const results = config.predicates.map((predicate) => {
      const actual = getByPath(row, predicate.field)
      const expected = resolvePredicateExpected(predicate, args, context)
      return compareValues(actual, predicate.op as never, expected)
    })
    if (results.length === 0) return true
    return mode === 'or' ? results.some(Boolean) : results.every(Boolean)
  })
}

function applyMapFieldsTransform(
  rows: Record<string, unknown>[],
  mappings: Record<string, DynamicValueSelector>,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped = { ...row }
    for (const [key, selector] of Object.entries(mappings)) {
      mapped[key] = readSelector(selector, row, args, context)
    }
    return mapped
  })
}

function applyUniqueTransform(
  rows: Record<string, unknown>[],
  by: string,
): Record<string, unknown>[] {
  const seen = new Set<string>()
  const deduped: Record<string, unknown>[] = []
  for (const row of rows) {
    const key = toStableKey(getByPath(row, by))
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

function applySortTransform(
  rows: Record<string, unknown>[],
  by: string,
  direction: 'asc' | 'desc' = 'asc',
  valueType: 'string' | 'number' = 'string',
): Record<string, unknown>[] {
  const dir = direction === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const av = getByPath(a, by)
    const bv = getByPath(b, by)
    if (valueType === 'number') {
      const an = Number(av ?? 0)
      const bn = Number(bv ?? 0)
      if (Number.isNaN(an) && Number.isNaN(bn)) return 0
      if (Number.isNaN(an)) return -1 * dir
      if (Number.isNaN(bn)) return 1 * dir
      return (an - bn) * dir
    }
    return toPlainString(av).localeCompare(toPlainString(bv)) * dir
  })
}

function applyFlattenPathTransform(
  input: unknown,
  path: string,
): Record<string, unknown>[] {
  const flattened: Record<string, unknown>[] = []
  if (Array.isArray(input)) {
    for (const item of normalizeRows(input)) {
      const value = getByPath(item, path)
      if (!Array.isArray(value)) {
        flattened.push(item)
        continue
      }
      const key = getLastPathSegment(path)
      for (const child of value) {
        if (isRecord(child)) {
          flattened.push({ ...item, ...child })
        } else {
          flattened.push({ ...item, [key]: child })
        }
      }
    }
    return flattened
  }

  const extracted = getByPath(input, path)
  if (!Array.isArray(extracted)) return []
  for (const child of extracted) {
    if (isRecord(child)) {
      flattened.push(child)
    } else {
      flattened.push({ value: child })
    }
  }
  return flattened
}

function applyDslTransforms(
  rows: Record<string, unknown>[],
  definition: Exclude<DynamicOptionFunctionDef, DynamicOptionGraphFunctionDef>,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): Record<string, unknown>[] {
  let current = [...rows]
  for (const transform of definition.transforms ?? []) {
    if (transform.kind === 'filter') {
      current = applyFilterTransform(current, transform, args, context)
      continue
    }

    if (transform.kind === 'map_fields') {
      current = applyMapFieldsTransform(current, transform.mappings, args, context)
      continue
    }

    if (transform.kind === 'unique') {
      current = applyUniqueTransform(current, transform.by)
      continue
    }

    if (transform.kind === 'sort') {
      current = applySortTransform(
        current,
        transform.by,
        transform.direction ?? 'asc',
        transform.valueType ?? 'string',
      )
      continue
    }

    if (transform.kind === 'limit') {
      current = current.slice(0, Math.max(0, transform.count))
      continue
    }

    if (transform.kind === 'flatten_path') {
      current = applyFlattenPathTransform(current, transform.path)
      continue
    }
  }
  return current
}

function mapRowsToOptions(
  rows: Record<string, unknown>[],
  mapping: DynamicOptionOutputMapping,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): DynamicOption[] {
  const output: DynamicOption[] = []
  for (const row of rows) {
    const labelValue = readSelector(mapping.label, row, args, context)
    const valueValue = readSelector(mapping.value, row, args, context)
    if (labelValue == null || valueValue == null) continue

    const option: DynamicOption = {
      label: toPlainString(labelValue),
      value: valueValue,
    }

    if (mapping.id) {
      const idValue = readSelector(mapping.id, row, args, context)
      if (idValue != null) option.id = toPlainString(idValue)
    } else {
      option.id = toPlainString(valueValue)
    }

    if (mapping.extra) {
      for (const [key, selector] of Object.entries(mapping.extra)) {
        option[key] = readSelector(selector, row, args, context)
      }
    }

    output.push(option)
  }
  return output
}

function buildLayoutRows(context: DynamicOptionsContext, includeHidden: boolean, excludeSharedTab: boolean): Record<string, unknown>[] {
  const gridMap = new Map(context.grids.map((g) => [g.id, g]))
  const fieldMap = new Map(context.fields.map((f) => [f.id, f]))
  const sectionMap = new Map((context.sections ?? []).map((s) => [s.id, s]))

  const rows: Record<string, unknown>[] = []
  if (context.layoutNodes?.length) {
    for (const node of context.layoutNodes) {
      const grid = gridMap.get(node.gridId)
      const field = fieldMap.get(node.fieldId)
      if (!grid || !field) continue
      const section = sectionMap.get(grid.sectionId)
      if (!includeHidden && toRecord(field.config).isHidden === true) continue
      if (excludeSharedTab && section?.tabId === 'shared_tab') continue
      rows.push({
        gridId: grid.id,
        gridName: grid.name,
        sectionId: section?.id,
        tabId: section?.tabId,
        fieldId: field.id,
        fieldLabel: field.ui?.label,
        dataType: field.dataType,
        path: `${grid.id}.${field.id}`,
        isHidden: toRecord(field.config).isHidden === true,
      })
    }
    return rows
  }

  for (const field of context.fields) {
    if (!includeHidden && toRecord(field.config).isHidden === true) continue
    rows.push({
      fieldId: field.id,
      fieldLabel: field.ui?.label,
      dataType: field.dataType,
      isHidden: toRecord(field.config).isHidden === true,
    })
  }
  return rows
}

function interpolateTemplate(
  value: string,
  args: Record<string, unknown>,
  context: DynamicOptionsContext,
): string {
  return value.replace(/\{\{\s*(arg|context)\.([^\s{}]+)\s*\}\}/g, (_match, namespace, path) => {
    if (namespace === 'arg') {
      return toPlainString(args[path])
    }
    return toPlainString(getByPath(context, path))
  })
}

async function executeHttpGetRequest(
  source: {
    connectorId: string
    path?: string
    query?: Record<string, string>
    headers?: Record<string, string>
    responsePath?: string
  },
  context: DynamicOptionsContext,
  args: Record<string, unknown>,
  options: ExecuteDynamicFunctionOptions,
  warnings: string[],
): Promise<unknown> {
  const connectorMap = {
    ...(context.dynamicOptions?.connectors ?? {}),
    ...(options.connectors ?? {}),
  }
  const connector = connectorMap[source.connectorId]
  if (!connector) {
    warnings.push(`Connector "${source.connectorId}" not found`)
    return null
  }

  const base = new URL(connector.baseUrl)
  const url = new URL(source.path ?? '', base)

  const query = source.query ?? {}
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, interpolateTemplate(value, args, context))
  }

  if (connector.allowHosts?.length && !connector.allowHosts.includes(url.host)) {
    warnings.push(`Host "${url.host}" is not allowlisted for connector "${connector.id}"`)
    return null
  }

  const headers: Record<string, string> = {
    ...(connector.defaultHeaders ?? {}),
  }
  for (const [k, v] of Object.entries(source.headers ?? {})) {
    headers[k] = interpolateTemplate(v, args, context)
  }

  if (connector.auth.type === 'secret_ref') {
    const resolver = options.secretResolver
    if (!resolver) {
      warnings.push('Missing secret resolver for connector auth type secret_ref')
      return null
    }
    const secret = await resolver(connector.auth.secretRefId)
    if (!secret) {
      warnings.push(`Secret "${connector.auth.secretRefId}" not found`)
      return null
    }
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${secret}`
    }
  }

  const fetcher = options.fetcher ?? fetch
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 10000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    if (!response.ok) {
      warnings.push(`HTTP source failed with status ${response.status}`)
      return null
    }

    const text = await response.text()
    if (text.length > 1_000_000) {
      warnings.push('HTTP response exceeded max size')
      return null
    }

    let payload: unknown = null
    try {
      payload = JSON.parse(text)
    } catch {
      warnings.push('HTTP response is not valid JSON')
      return null
    }

    return source.responsePath ? getByPath(payload, source.responsePath) : payload
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeCurrentContext(node: Extract<DynamicFunctionGraphNode, { kind: 'source.current_context' }>, context: DynamicOptionsContext): Record<string, unknown> {
  const cfg = node.config ?? {}
  const includeRowValues = cfg.includeRowValues !== false
  const includeFieldMetadata = cfg.includeFieldMetadata !== false
  const includeLayoutMetadata = cfg.includeLayoutMetadata !== false

  const result: Record<string, unknown> = {
    gridId: context.runtime?.currentGridId,
    fieldId: context.runtime?.currentFieldId,
    rowIndex: context.runtime?.rowIndex,
  }

  if (includeRowValues) {
    result.row = toRecord(context.runtime?.currentRow)
  }
  if (includeFieldMetadata) {
    result.fields = context.fields.map((field) => ({
      id: field.id,
      label: field.ui?.label,
      dataType: field.dataType,
      config: toRecord(field.config),
    }))
  }
  if (includeLayoutMetadata) {
    result.layout = (context.layoutNodes ?? []).map((nodeRef) => ({
      gridId: nodeRef.gridId,
      fieldId: nodeRef.fieldId,
    }))
  }

  return result
}

async function executeGraphFunction(
  definition: DynamicOptionGraphFunctionDef,
  options: ExecuteDynamicFunctionOptions,
): Promise<ExecuteDynamicFunctionResult> {
  const warnings: string[] = []
  const args = options.args ?? {}
  const context = options.context
  const connectors = {
    ...(context.dynamicOptions?.connectors ?? {}),
    ...(options.connectors ?? {}),
  }

  const compiled = compileDynamicOptionFunctionGraph(definition, Object.keys(connectors))
  if (!compiled.ok || !compiled.plan) {
    return {
      options: [],
      warnings: compiled.errors.map((error) => error.message),
      requiresRemote: false,
      source: 'local_custom',
    }
  }

  if (compiled.plan.requiresRemote && !options.allowHttpGet) {
    return {
      options: [],
      warnings,
      requiresRemote: true,
      source: 'remote_custom',
    }
  }

  const valuesByNodeId = new Map<string, unknown>()

  for (const nodeId of compiled.plan.executionOrder) {
    const node = compiled.plan.nodesById.get(nodeId)
    if (!node) continue

    const incoming = compiled.plan.incomingByNodeId.get(node.id) ?? []
    const inputValue = incoming.length > 0
      ? valuesByNodeId.get(incoming[0]!.source)
      : undefined

    if (node.kind === 'control.start') {
      valuesByNodeId.set(node.id, {
        args,
        runtime: context.runtime ?? {},
      })
      continue
    }

    if (node.kind === 'source.grid_rows') {
      valuesByNodeId.set(node.id, normalizeRows(context.gridData?.[node.config.gridId] ?? []))
      continue
    }

    if (node.kind === 'source.current_context') {
      valuesByNodeId.set(node.id, normalizeCurrentContext(node, context))
      continue
    }

    if (node.kind === 'source.layout_fields') {
      valuesByNodeId.set(
        node.id,
        buildLayoutRows(
          context,
          node.config?.includeHidden === true,
          node.config?.excludeSharedTab !== false,
        ),
      )
      continue
    }

    if (node.kind === 'source.http_get') {
      const payload = await executeHttpGetRequest(node.config, context, args, options, warnings)
      valuesByNodeId.set(node.id, payload)
      continue
    }

    if (node.kind === 'transform.filter') {
      valuesByNodeId.set(node.id, applyFilterTransform(normalizeRows(inputValue), node.config, args, context))
      continue
    }

    if (node.kind === 'transform.map_fields') {
      valuesByNodeId.set(
        node.id,
        applyMapFieldsTransform(normalizeRows(inputValue), node.config.mappings, args, context),
      )
      continue
    }

    if (node.kind === 'transform.unique') {
      valuesByNodeId.set(node.id, applyUniqueTransform(normalizeRows(inputValue), node.config.by))
      continue
    }

    if (node.kind === 'transform.sort') {
      valuesByNodeId.set(
        node.id,
        applySortTransform(
          normalizeRows(inputValue),
          node.config.by,
          node.config.direction ?? 'asc',
          node.config.valueType ?? 'string',
        ),
      )
      continue
    }

    if (node.kind === 'transform.limit') {
      valuesByNodeId.set(node.id, normalizeRows(inputValue).slice(0, Math.max(0, node.config.count)))
      continue
    }

    if (node.kind === 'transform.flatten_path') {
      valuesByNodeId.set(node.id, applyFlattenPathTransform(inputValue, node.config.path))
      continue
    }

    if (node.kind === 'ai.extract_options') {
      const extractor = options.aiExtractor
      if (!extractor) {
        warnings.push('AI extractor is not configured for ai.extract_options node')
        valuesByNodeId.set(node.id, [])
      } else {
        const sourceInput = node.config.inputPath
          ? getByPath(inputValue, node.config.inputPath)
          : inputValue
        const rows = await extractor({
          prompt: node.config.prompt,
          input: sourceInput,
          maxRows: node.config.maxRows ?? 500,
        })
        valuesByNodeId.set(node.id, normalizeRows(rows))
      }
      continue
    }

    if (node.kind === 'output.options') {
      const rows = normalizeRows(inputValue)
      const mapped = mapRowsToOptions(rows, node.config.mapping, args, context)
      valuesByNodeId.set(node.id, mapped)
      continue
    }
  }

  const returnValue = valuesByNodeId.get(definition.graph.returnNodeId)
  const mapped = Array.isArray(returnValue)
    ? returnValue.filter((item): item is DynamicOption => isRecord(item) && typeof item.label === 'string')
    : []

  return {
    options: mapped.slice(0, options.maxItems ?? 500),
    warnings,
    requiresRemote: false,
    source: compiled.plan.requiresRemote ? 'remote_custom' : 'local_custom',
  }
}

async function executeDslFunction(
  definition: Exclude<DynamicOptionFunctionDef, DynamicOptionGraphFunctionDef>,
  options: ExecuteDynamicFunctionOptions,
): Promise<ExecuteDynamicFunctionResult> {
  const { context } = options
  const args = options.args ?? {}
  const warnings: string[] = []

  let rows: Record<string, unknown>[] = []
  let source: ExecuteDynamicFunctionResult['source'] = 'local_custom'

  if (definition.source.kind === 'builtin_ref') {
    const resolveBuiltIn = options.resolveBuiltIn
    if (!resolveBuiltIn) {
      warnings.push('Built-in resolver is unavailable')
      rows = []
    } else {
      const builtIn = resolveBuiltIn(definition.source.functionId, context)
      rows = builtIn.map((item) => toRecord(item))
      source = 'builtin'
    }
  } else if (definition.source.kind === 'grid_rows') {
    rows = normalizeRows(context.gridData?.[definition.source.gridId] ?? [])
  } else if (definition.source.kind === 'layout_fields') {
    rows = buildLayoutRows(
      context,
      definition.source.includeHidden === true,
      definition.source.excludeSharedTab !== false,
    )
  } else if (definition.source.kind === 'http_get') {
    if (!options.allowHttpGet) {
      return {
        options: [],
        warnings,
        requiresRemote: true,
        source: 'remote_custom',
      }
    }
    const payload = await executeHttpGetRequest(definition.source, context, args, options, warnings)
    rows = normalizeRows(Array.isArray(payload) ? payload : [])
    source = 'remote_custom'
  }

  const transformed = applyDslTransforms(rows, definition, args, context)
  const mapped = mapRowsToOptions(transformed, definition.output, args, context)

  return {
    options: mapped.slice(0, options.maxItems ?? 500),
    warnings,
    requiresRemote: false,
    source,
  }
}

export async function executeDynamicOptionFunction(
  options: ExecuteDynamicFunctionOptions,
): Promise<ExecuteDynamicFunctionResult> {
  const { definition } = options

  if (definition.enabled === false) {
    return {
      options: [],
      warnings: [`Function "${definition.id}" is disabled`],
      requiresRemote: false,
      source: 'local_custom',
    }
  }

  if (isGraphFunction(definition)) {
    return executeGraphFunction(definition, options)
  }

  return executeDslFunction(definition, options)
}
