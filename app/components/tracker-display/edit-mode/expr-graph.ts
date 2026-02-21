import type { Edge, Node, XYPosition } from 'reactflow'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
import type { ExprFlowOperator } from './expr-types'

export interface ExprFlowNodeData {
  op?: ExprFlowOperator
  fieldId?: string
  value?: string
}

export type ExprFlowNode = Node<ExprFlowNodeData>

const RESULT_HANDLE_ID = 'in'
const INPUT_HANDLES = ['a', 'b'] as const

const toNumberOrUndefined = (value: string): number | undefined => {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseConstValue(value: string | undefined): { ok: boolean; value?: unknown } {
  if (value == null || value.trim() === '') return { ok: false }
  const trimmed = value.trim()
  if (trimmed === 'true') return { ok: true, value: true }
  if (trimmed === 'false') return { ok: true, value: false }
  if (trimmed === 'null') return { ok: true, value: null }
  const num = toNumberOrUndefined(trimmed)
  if (num !== undefined) return { ok: true, value: num }
  return { ok: true, value }
}

function getIncomingByHandle(edges: Edge[], nodeId: string): Map<string, Edge[]> {
  const map = new Map<string, Edge[]>()
  edges.forEach((edge) => {
    if (edge.target !== nodeId) return
    const handle = edge.targetHandle ?? ''
    const list = map.get(handle) ?? []
    list.push(edge)
    map.set(handle, list)
  })
  return map
}

function getSingleSource(incoming: Map<string, Edge[]>, handle: string): string | null {
  const list = incoming.get(handle) ?? []
  if (list.length === 0) return null
  if (list.length > 1) return null
  return list[0].source
}

export function compileExprFromGraph(
  nodes: ExprFlowNode[],
  edges: Edge[],
): { expr?: ExprNode; error?: string } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const resultNode = nodes.find((n) => n.type === 'result')
  if (!resultNode) return { error: 'Result node is missing.' }

  const incoming = getIncomingByHandle(edges, resultNode.id)
  const rootSource = getSingleSource(incoming, RESULT_HANDLE_ID)
  if (!rootSource) return { error: 'Connect one node to the Result input.' }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  const build = (nodeId: string): ExprNode | null => {
    if (visiting.has(nodeId)) return null
    if (visited.has(nodeId)) {
      const cached = nodeMap.get(nodeId) as ExprFlowNode | undefined
      if (!cached) return null
    }
    const node = nodeMap.get(nodeId)
    if (!node) return null
    visiting.add(nodeId)

    const nodeIncoming = getIncomingByHandle(edges, nodeId)

    if (node.type === 'field') {
      const fieldId = node.data?.fieldId
      visiting.delete(nodeId)
      visited.add(nodeId)
      if (!fieldId) return null
      return { op: 'field', fieldId }
    }

    if (node.type === 'const') {
      const parsed = parseConstValue(node.data?.value)
      visiting.delete(nodeId)
      visited.add(nodeId)
      if (!parsed.ok) return null
      return { op: 'const', value: parsed.value }
    }

    if (node.type === 'op') {
      const op = node.data?.op
      if (!op) return null
      const leftSource = getSingleSource(nodeIncoming, INPUT_HANDLES[0])
      const rightSource = getSingleSource(nodeIncoming, INPUT_HANDLES[1])
      if (!leftSource || !rightSource) return null
      const left = build(leftSource)
      const right = build(rightSource)
      visiting.delete(nodeId)
      visited.add(nodeId)
      if (!left || !right) return null
      if (op === 'add' || op === 'mul') {
        return { op, args: [left, right] }
      }
      return { op, left, right } as ExprNode
    }

    visiting.delete(nodeId)
    visited.add(nodeId)
    return null
  }

  const expr = build(rootSource)
  if (!expr) return { error: 'Graph is missing required inputs or has a cycle.' }
  return { expr: normalizeExprNode(expr) }
}

let nodeIdCounter = 0

function nextId() {
  nodeIdCounter += 1
  return `expr_node_${nodeIdCounter}`
}

function placeNode(depth: number, row: number): XYPosition {
  return { x: depth * 240, y: row * 120 }
}

function toBinaryTree(op: 'add' | 'mul', args: ExprNode[]): ExprNode {
  if (args.length <= 2) {
    return { op, args } as ExprNode
  }
  const [head, ...rest] = args
  return {
    op,
    args: [head, toBinaryTree(op, rest)],
  } as ExprNode
}

function splitBinary(
  op: 'add' | 'mul',
  node: ExprNode,
): { left: ExprNode; right: ExprNode } | null {
  const maybe = node as ExprNode & { args?: ExprNode[]; left?: ExprNode; right?: ExprNode }
  if (Array.isArray(maybe.args) && maybe.args.length >= 2) {
    if (maybe.args.length > 2) {
      const binary = toBinaryTree(op, maybe.args)
      return splitBinary(op, binary)
    }
    return { left: maybe.args[0], right: maybe.args[1] }
  }
  if (maybe.left && maybe.right) return { left: maybe.left, right: maybe.right }
  return null
}

export function exprToGraph(expr: ExprNode): { nodes: ExprFlowNode[]; edges: Edge[] } {
  nodeIdCounter = 0
  const nodes: ExprFlowNode[] = []
  const edges: Edge[] = []
  let row = 0
  const depthById = new Map<string, number>()
  let maxDepth = 1

  const build = (node: ExprNode, depth: number): string => {
    const id = nextId()
    const position = placeNode(depth, row)
    row += 1
    depthById.set(id, depth)
    maxDepth = Math.max(maxDepth, depth)

    if (node.op === 'field') {
      nodes.push({
        id,
        type: 'field',
        position,
        data: { fieldId: node.fieldId },
      })
      return id
    }

    if (node.op === 'const') {
      nodes.push({
        id,
        type: 'const',
        position,
        data: { value: String(node.value ?? '') },
      })
      return id
    }

    if (node.op === 'add' || node.op === 'mul') {
      const pair = splitBinary(node.op, node)
      const left = pair?.left ?? { op: 'const', value: 0 }
      const right = pair?.right ?? { op: 'const', value: 0 }
      nodes.push({
        id,
        type: 'op',
        position,
        data: { op: node.op },
      })
      const leftId = build(left, depth + 1)
      const rightId = build(right, depth + 1)
      edges.push(
        { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
        { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
      )
      return id
    }

    nodes.push({
      id,
      type: 'op',
      position,
      data: { op: node.op as ExprFlowOperator },
    })
    const binary = node as ExprNode & { left?: ExprNode; right?: ExprNode; args?: ExprNode[] }
    const left = binary.left ?? binary.args?.[0] ?? { op: 'const', value: 0 }
    const right = binary.right ?? binary.args?.[1] ?? { op: 'const', value: 0 }
    const leftId = build(left, depth + 1)
    const rightId = build(right, depth + 1)
    edges.push(
      { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
      { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
    )
    return id
  }

  const rootId = build(expr, 1)
  const rootNode = nodes.find((node) => node.id === rootId)
  const resultId = nextId()
  nodes.push({
    id: resultId,
    type: 'result',
    position: { x: 0, y: rootNode?.position.y ?? 0 },
    data: {},
    deletable: false,
  })
  edges.push({
    id: `${rootId}-${resultId}-in`,
    source: rootId,
    target: resultId,
    targetHandle: RESULT_HANDLE_ID,
  })

  const orientedNodes = nodes.map((node) => {
    if (node.id === resultId) {
      return {
        ...node,
        position: { ...node.position, x: maxDepth * 240 },
      }
    }
    const depth = depthById.get(node.id) ?? 1
    return {
      ...node,
      position: { ...node.position, x: (maxDepth - depth) * 240 },
    }
  })

  return { nodes: orientedNodes, edges }
}

export const FLOW_CONSTANTS = {
  RESULT_HANDLE_ID,
  INPUT_HANDLES,
}
