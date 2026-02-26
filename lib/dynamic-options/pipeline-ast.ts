/**
 * Pipeline AST: linear pipeline representation for dynamic options.
 * Conversion to/from graph for validation, explain, and editor round-trip.
 */

import type {
  DynamicFunctionGraphDef,
  DynamicFunctionGraphEdge,
  DynamicFunctionGraphNode,
  DynamicOptionOutputMapping,
  DynamicPipelineAst,
  DynamicPipelineSourceStep,
  DynamicPipelineTransformStep,
} from './types'

const ENTRY_ID = 'start_1'
const DEFAULT_DX = 240
const DEFAULT_Y = 160

function nodeToSourceStep(node: DynamicFunctionGraphNode): DynamicPipelineSourceStep | null {
  switch (node.kind) {
    case 'source.grid_rows':
      return { kind: 'source.grid_rows', config: { gridId: node.config.gridId } }
    case 'source.current_context':
      return {
        kind: 'source.current_context',
        config: node.config
          ? {
            includeRowValues: node.config.includeRowValues,
            includeFieldMetadata: node.config.includeFieldMetadata,
            includeLayoutMetadata: node.config.includeLayoutMetadata,
          }
          : undefined,
      }
    case 'source.layout_fields':
      return {
        kind: 'source.layout_fields',
        config: node.config
          ? {
            includeHidden: node.config.includeHidden,
            excludeSharedTab: node.config.excludeSharedTab,
          }
          : undefined,
      }
    case 'source.http_get':
      return {
        kind: 'source.http_get',
        config: {
          connectorId: node.config.connectorId,
          path: node.config.path,
          query: node.config.query,
          headers: node.config.headers,
          responsePath: node.config.responsePath,
        },
      }
    default:
      return null
  }
}

function nodeToTransformStep(node: DynamicFunctionGraphNode): DynamicPipelineTransformStep | null {
  switch (node.kind) {
    case 'transform.filter':
      return {
        kind: 'transform.filter',
        config: {
          mode: node.config.mode,
          predicates: node.config.predicates ?? [],
          expr: node.config.expr,
        },
      }
    case 'transform.map_fields':
      return { kind: 'transform.map_fields', config: { mappings: node.config.mappings } }
    case 'transform.unique':
      return { kind: 'transform.unique', config: { by: node.config.by } }
    case 'transform.sort':
      return {
        kind: 'transform.sort',
        config: {
          by: node.config.by,
          direction: node.config.direction,
          valueType: node.config.valueType,
        },
      }
    case 'transform.limit':
      return { kind: 'transform.limit', config: { count: node.config.count } }
    case 'transform.flatten_path':
      return { kind: 'transform.flatten_path', config: { path: node.config.path } }
    case 'ai.extract_options':
      return {
        kind: 'ai.extract_options',
        config: {
          prompt: node.config.prompt,
          inputPath: node.config.inputPath,
          maxRows: node.config.maxRows,
        },
      }
    default:
      return null
  }
}

/**
 * Convert a linear graph to pipeline AST.
 * Fails if the graph is not a single linear path (one entry, one return, one path).
 */
export function graphToPipelineAst(
  graph: DynamicFunctionGraphDef
): { ast?: DynamicPipelineAst; error?: string } {
  const nodesById = new Map<string, DynamicFunctionGraphNode>()
  for (const node of graph.nodes) {
    if (nodesById.has(node.id)) {
      return { error: `Duplicate node id: ${node.id}` }
    }
    nodesById.set(node.id, node)
  }

  const entry = nodesById.get(graph.entryNodeId)
  if (!entry) {
    return { error: `Entry node "${graph.entryNodeId}" not found` }
  }
  if (entry.kind !== 'control.start') {
    return { error: 'Entry must be control.start' }
  }

  const returnNode = nodesById.get(graph.returnNodeId)
  if (!returnNode) {
    return { error: `Return node "${graph.returnNodeId}" not found` }
  }
  if (returnNode.kind !== 'output.options') {
    return { error: 'Return must be output.options' }
  }

  const outgoingByNode = new Map<string, DynamicFunctionGraphEdge[]>()
  for (const edge of graph.edges) {
    const list: DynamicFunctionGraphEdge[] = outgoingByNode.get(edge.source) ?? []
    list.push(edge)
    outgoingByNode.set(edge.source, list)
  }

  // Walk single path from entry
  const path: DynamicFunctionGraphNode[] = []
  let currentId: string | null = entry.id
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) {
      return { error: 'Graph contains a cycle' }
    }
    visited.add(currentId)
    const node = nodesById.get(currentId)!
    if (node.kind !== 'control.start') {
      path.push(node)
    }
    if (node.kind === 'output.options') {
      break
    }
    const outgoing: DynamicFunctionGraphEdge[] = outgoingByNode.get(currentId) ?? []
    if (outgoing.length > 1) {
      return { error: 'Branching not supported; pipeline must be linear' }
    }
    if (outgoing.length === 0) {
      return { error: 'Return node not reachable from entry' }
    }
    currentId = outgoing[0].target
  }

  if (path.length === 0) {
    return { error: 'Pipeline must have at least a source and output' }
  }

  const sourceStep = nodeToSourceStep(path[0])
  if (!sourceStep) {
    return { error: `First step after start must be a source node, got ${path[0].kind}` }
  }

  const steps: DynamicPipelineTransformStep[] = []
  for (let i = 1; i < path.length; i++) {
    const node = path[i]
    if (node.kind === 'output.options') {
      break
    }
    const step = nodeToTransformStep(node)
    if (!step) {
      return { error: `Unexpected node in pipeline: ${node.kind}` }
    }
    steps.push(step)
  }

  const lastPathNode = path[path.length - 1]
  if (lastPathNode.kind !== 'output.options') {
    return { error: 'Pipeline must end with output.options' }
  }
  const output: DynamicOptionOutputMapping = lastPathNode.config.mapping

  return {
    ast: { source: sourceStep, steps, output },
  }
}

/**
 * Build a linear graph from pipeline AST. Uses stable node ids and positions.
 */
export function pipelineAstToGraph(ast: DynamicPipelineAst): DynamicFunctionGraphDef {
  const nodes: DynamicFunctionGraphNode[] = []
  const edges: DynamicFunctionGraphEdge[] = []
  let x = 40
  const y = DEFAULT_Y

  const startId = ENTRY_ID
  nodes.push({
    id: startId,
    kind: 'control.start',
    position: { x, y },
    config: {},
  })
  x += DEFAULT_DX

  const sourceNodeId = 'source_1'
  const sourceKind = ast.source.kind
  const sourceConfig = ast.source.config as Record<string, unknown>
  nodes.push({
    id: sourceNodeId,
    kind: sourceKind,
    position: { x, y },
    config: sourceConfig,
  } as DynamicFunctionGraphNode)
  edges.push({ id: 'e_start_source', source: startId, target: sourceNodeId })
  x += DEFAULT_DX

  let prevId = sourceNodeId
  ast.steps.forEach((step, index) => {
    const stepId = `step_${index + 1}`
    const stepKind = step.kind
    const stepConfig = step.config as Record<string, unknown>
    nodes.push({
      id: stepId,
      kind: stepKind,
      position: { x, y },
      config: stepConfig,
    } as DynamicFunctionGraphNode)
    edges.push({ id: `e_${prevId}_${stepId}`, source: prevId, target: stepId })
    prevId = stepId
    x += DEFAULT_DX
  })

  const outputId = 'output_1'
  nodes.push({
    id: outputId,
    kind: 'output.options',
    position: { x, y },
    config: { mapping: ast.output },
  })
  edges.push({ id: `e_${prevId}_output`, source: prevId, target: outputId })

  return {
    nodes,
    edges,
    entryNodeId: startId,
    returnNodeId: outputId,
  }
}
