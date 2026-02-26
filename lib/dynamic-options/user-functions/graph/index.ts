import type {
  CompileDynamicFunctionGraphResult,
  CompiledDynamicFunctionPlan,
  DynamicFunctionGraphEdge,
  DynamicFunctionGraphNode,
  DynamicGraphPortType,
  DynamicOptionCompileIssue,
  DynamicOptionFunctionDef,
  DynamicOptionGraphFunctionDef,
} from '@/lib/dynamic-options/types'
import { dynamicFunctionGraphSchema } from '../schema'

const SERVER_ONLY_NODE_KINDS = new Set<DynamicFunctionGraphNode['kind']>([
  'source.http_get',
  'ai.extract_options',
])

const COMPILED_GRAPH_CACHE_LIMIT = 1000
const graphSignatureCache = new Map<string, CompiledDynamicFunctionPlan>()
const graphReferenceCache = new WeakMap<DynamicOptionGraphFunctionDef, CompiledDynamicFunctionPlan>()

function isGraphFunction(
  definition: DynamicOptionFunctionDef,
): definition is DynamicOptionGraphFunctionDef {
  return definition.engine === 'graph_v1'
}

function getNodeOutputType(node: DynamicFunctionGraphNode): DynamicGraphPortType {
  switch (node.kind) {
    case 'control.start':
      return 'object'
    case 'source.grid_rows':
    case 'source.layout_fields':
    case 'transform.filter':
    case 'transform.map_fields':
    case 'transform.unique':
    case 'transform.sort':
    case 'transform.limit':
    case 'transform.flatten_path':
    case 'ai.extract_options':
      return 'rows'
    case 'source.current_context':
    case 'source.http_get':
      return 'object'
    case 'output.options':
      return 'options'
    default:
      return 'rows'
  }
}

function getNodeInputType(node: DynamicFunctionGraphNode): DynamicGraphPortType | 'any' | null {
  switch (node.kind) {
    case 'control.start':
      return null
    case 'source.grid_rows':
    case 'source.current_context':
    case 'source.layout_fields':
    case 'source.http_get':
      return 'object'
    case 'transform.filter':
    case 'transform.map_fields':
    case 'transform.unique':
    case 'transform.sort':
    case 'transform.limit':
    case 'output.options':
      return 'rows'
    case 'transform.flatten_path':
    case 'ai.extract_options':
      return 'any'
    default:
      return 'any'
  }
}

function trimIssues(issues: DynamicOptionCompileIssue[]): DynamicOptionCompileIssue[] {
  return issues.map((issue) => ({
    message: issue.message,
    ...(issue.nodeId ? { nodeId: issue.nodeId } : {}),
    ...(issue.edgeId ? { edgeId: issue.edgeId } : {}),
  }))
}

function buildSignature(definition: DynamicOptionGraphFunctionDef, connectorIds?: Iterable<string>): string {
  const connectors = connectorIds ? Array.from(connectorIds).sort() : []
  let graphJson = ''
  try {
    graphJson = JSON.stringify(definition.graph)
  } catch {
    graphJson = `${definition.graph.nodes.length}:${definition.graph.edges.length}`
  }
  return `${definition.id}::${definition.version}::${graphJson}::${connectors.join('|')}`
}

function pushIssue(
  issues: DynamicOptionCompileIssue[],
  issue: DynamicOptionCompileIssue,
) {
  issues.push(issue)
}

export function compileDynamicOptionFunctionGraph(
  definition: DynamicOptionFunctionDef,
  connectorIds?: Iterable<string>,
): CompileDynamicFunctionGraphResult {
  if (!isGraphFunction(definition)) {
    return {
      ok: false,
      errors: [{ message: 'Function is not a graph_v1 definition' }],
    }
  }

  const cachedByRef = graphReferenceCache.get(definition)
  if (cachedByRef) {
    return {
      ok: true,
      plan: cachedByRef,
      errors: [],
    }
  }

  const signature = buildSignature(definition, connectorIds)
  const cachedBySignature = graphSignatureCache.get(signature)
  if (cachedBySignature) {
    graphReferenceCache.set(definition, cachedBySignature)
    return {
      ok: true,
      plan: cachedBySignature,
      errors: [],
    }
  }

  const parsed = dynamicFunctionGraphSchema.safeParse(definition.graph)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      message: issue.message,
    }))
    return { ok: false, errors }
  }

  const graph = parsed.data
  const issues: DynamicOptionCompileIssue[] = []
  const nodesById = new Map<string, DynamicFunctionGraphNode>()
  const incomingByNodeId = new Map<string, DynamicFunctionGraphEdge[]>()
  const outgoingByNodeId = new Map<string, DynamicFunctionGraphEdge[]>()

  for (const node of graph.nodes) {
    if (nodesById.has(node.id)) {
      pushIssue(issues, {
        message: `Duplicate node id "${node.id}"`,
        nodeId: node.id,
      })
      continue
    }
    nodesById.set(node.id, node)
    incomingByNodeId.set(node.id, [])
    outgoingByNodeId.set(node.id, [])
  }

  for (const edge of graph.edges) {
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (!source || !target) {
      pushIssue(issues, {
        message: `Edge "${edge.id}" references a missing node`,
        edgeId: edge.id,
      })
      continue
    }
    outgoingByNodeId.get(source.id)?.push(edge)
    incomingByNodeId.get(target.id)?.push(edge)
  }

  const entryNode = nodesById.get(graph.entryNodeId)
  if (!entryNode) {
    pushIssue(issues, { message: `entryNodeId "${graph.entryNodeId}" does not exist` })
  } else if (entryNode.kind !== 'control.start') {
    pushIssue(issues, {
      message: 'entryNodeId must reference a control.start node',
      nodeId: entryNode.id,
    })
  }

  const returnNode = nodesById.get(graph.returnNodeId)
  if (!returnNode) {
    pushIssue(issues, { message: `returnNodeId "${graph.returnNodeId}" does not exist` })
  } else if (returnNode.kind !== 'output.options') {
    pushIssue(issues, {
      message: 'returnNodeId must reference an output.options node',
      nodeId: returnNode.id,
    })
  }

  const returnCandidates = graph.nodes.filter((node) => node.kind === 'output.options')
  if (returnCandidates.length !== 1) {
    pushIssue(issues, {
      message: 'Graph must contain exactly one output.options node',
    })
  }

  const connectorSet = new Set(Array.from(connectorIds ?? []))
  for (const node of graph.nodes) {
    if (node.kind === 'source.http_get' && connectorSet.size > 0) {
      const connectorId = node.config.connectorId
      if (!connectorSet.has(connectorId)) {
        pushIssue(issues, {
          message: `source.http_get references missing connector "${connectorId}"`,
          nodeId: node.id,
        })
      }
    }
  }

  for (const node of graph.nodes) {
    const inputType = getNodeInputType(node)
    const incoming = incomingByNodeId.get(node.id) ?? []

    if (inputType == null) {
      if (incoming.length > 0) {
        pushIssue(issues, {
          message: `${node.kind} should not have incoming edges`,
          nodeId: node.id,
        })
      }
      continue
    }

    if (incoming.length === 0) {
      pushIssue(issues, {
        message: `${node.kind} requires an incoming connection`,
        nodeId: node.id,
      })
      continue
    }

    if (incoming.length > 1) {
      pushIssue(issues, {
        message: `${node.kind} accepts only one incoming connection in v1`,
        nodeId: node.id,
      })
    }

    for (const edge of incoming) {
      const source = nodesById.get(edge.source)
      if (!source) continue
      const sourceType = getNodeOutputType(source)
      if (inputType !== 'any' && sourceType !== inputType) {
        pushIssue(issues, {
          message: `Type mismatch: ${source.kind} (${sourceType}) -> ${node.kind} (${inputType})`,
          edgeId: edge.id,
          nodeId: node.id,
        })
      }
    }
  }

  const indegree = new Map<string, number>()
  for (const node of graph.nodes) {
    indegree.set(node.id, (incomingByNodeId.get(node.id) ?? []).length)
  }

  const queue: string[] = []
  for (const [nodeId, count] of indegree.entries()) {
    if (count === 0) queue.push(nodeId)
  }

  const topo: string[] = []
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    topo.push(nodeId)
    for (const edge of outgoingByNodeId.get(nodeId) ?? []) {
      const nextCount = (indegree.get(edge.target) ?? 0) - 1
      indegree.set(edge.target, nextCount)
      if (nextCount === 0) queue.push(edge.target)
    }
  }

  if (topo.length !== graph.nodes.length) {
    pushIssue(issues, {
      message: 'Graph contains a cycle',
    })
  }

  const reachableFromEntry = new Set<string>()
  if (entryNode) {
    const stack = [entryNode.id]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (reachableFromEntry.has(current)) continue
      reachableFromEntry.add(current)
      for (const edge of outgoingByNodeId.get(current) ?? []) {
        stack.push(edge.target)
      }
    }
  }

  if (returnNode && !reachableFromEntry.has(returnNode.id)) {
    pushIssue(issues, {
      message: 'Return node is not reachable from entry node',
      nodeId: returnNode.id,
    })
  }

  if (issues.length > 0) {
    return {
      ok: false,
      errors: trimIssues(issues),
    }
  }

  const executionOrder = topo.filter((nodeId) => reachableFromEntry.has(nodeId))
  const reachableNodes = executionOrder
    .map((nodeId) => nodesById.get(nodeId))
    .filter((node): node is DynamicFunctionGraphNode => !!node)

  const plan: CompiledDynamicFunctionPlan = {
    functionId: definition.id,
    engine: 'graph_v1',
    executionOrder,
    nodesById,
    incomingByNodeId,
    outgoingByNodeId,
    requiresRemote: reachableNodes.some((node) => SERVER_ONLY_NODE_KINDS.has(node.kind)),
    usesRuntimeRow: reachableNodes.some((node) => node.kind === 'source.current_context'),
  }

  graphReferenceCache.set(definition, plan)
  if (graphSignatureCache.size >= COMPILED_GRAPH_CACHE_LIMIT) {
    graphSignatureCache.clear()
  }
  graphSignatureCache.set(signature, plan)

  return {
    ok: true,
    plan,
    errors: [],
  }
}
