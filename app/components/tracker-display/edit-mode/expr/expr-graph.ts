import type { Edge, Node, XYPosition } from 'reactflow'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
import type { AccumulateAction, AccumulatorKind, ExprFlowOperator, LogicOp, MathOp, StringOp } from './expr-types'

export interface ExprFlowNodeData {
  // op node
  op?: ExprFlowOperator
  // field node
  fieldId?: string
  // const node
  value?: string
  // accumulator node
  startIndex?: number
  endIndex?: number
  increment?: number
  action?: AccumulateAction
  accumulatorKind?: AccumulatorKind
  initialValue?: number
  // logic node
  logicOp?: LogicOp
  // math node
  mathOp?: MathOp
  // string node
  stringOp?: StringOp
  // variadic input count (logic: and/or, math: min/max, string: concat)
  inputCount?: number
  // regex config (string: regex)
  pattern?: string
  flags?: string
}

/** Single input handle for accumulator node (source field/column). */
export const ACCUMULATOR_SOURCE_HANDLE = 'source'

export type ExprFlowNode = Node<ExprFlowNodeData>

const RESULT_HANDLE_ID = 'in'
const INPUT_HANDLES = ['a', 'b'] as const

// Handle IDs for logic: if
const IF_HANDLES = { cond: 'cond', then: 'then', else: 'else' } as const
// Handle IDs for math: clamp
const CLAMP_HANDLES = { value: 'value', min: 'min', max: 'max' } as const
// Handle IDs for string: slice
const SLICE_HANDLES = { value: 'a', start: 'start', end: 'end' } as const

/** Build variadic handle ID: arg_0, arg_1, ... */
export const variadicHandleId = (index: number) => `arg_${index}`

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

  const rootNode = nodeMap.get(rootSource) as ExprFlowNode | undefined
  if (rootNode?.type === 'accumulator') {
    const accIncoming = getIncomingByHandle(edges, rootSource)
    const accSource = getSingleSource(accIncoming, ACCUMULATOR_SOURCE_HANDLE)
    const accSourceNode = accSource ? (nodeMap.get(accSource) as ExprFlowNode | undefined) : undefined
    if (!accSource || !accSourceNode || accSourceNode.type !== 'field' || !accSourceNode.data?.fieldId) {
      return { error: 'Accumulator must receive a single Field node.' }
    }
  }

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

    if (node.type === 'accumulator') {
      const sourceSource = getSingleSource(nodeIncoming, ACCUMULATOR_SOURCE_HANDLE)
      if (!sourceSource) {
        visiting.delete(nodeId)
        visited.add(nodeId)
        return null
      }
      const sourceNode = nodeMap.get(sourceSource) as ExprFlowNode | undefined
      if (!sourceNode || sourceNode.type !== 'field') {
        visiting.delete(nodeId)
        visited.add(nodeId)
        return null
      }
      const sourceFieldId = sourceNode.data?.fieldId
      if (!sourceFieldId) {
        visiting.delete(nodeId)
        visited.add(nodeId)
        return null
      }
      const kind = node.data?.accumulatorKind ?? 'accumulate'
      const inc = node.data?.increment
      const increment =
        inc != null && Number.isInteger(inc) && inc >= 1 ? inc : undefined
      const start = node.data?.startIndex
      const end = node.data?.endIndex
      const startIndex =
        start != null && Number.isInteger(start) ? start : undefined
      const endIndex =
        end != null && Number.isInteger(end) ? end : undefined
      const initialValue = node.data?.initialValue
      visiting.delete(nodeId)
      visited.add(nodeId)

      if (kind === 'count') {
        return { op: 'count', sourceFieldId } as ExprNode
      }
      if (kind === 'sum') {
        return {
          op: 'sum',
          sourceFieldId,
          startIndex,
          endIndex,
          increment,
          initialValue,
        } as ExprNode
      }
      const action = node.data?.action ?? 'add'
      return {
        op: 'accumulate',
        sourceFieldId,
        startIndex,
        endIndex,
        increment,
        action,
      } as ExprNode
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

    if (node.type === 'logic') {
      const logicOp = node.data?.logicOp
      if (!logicOp) { visiting.delete(nodeId); visited.add(nodeId); return null }

      if (logicOp === 'not') {
        const argSource = getSingleSource(nodeIncoming, 'a')
        if (!argSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const arg = build(argSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!arg) return null
        return { op: 'not', arg }
      }

      if (logicOp === 'if') {
        const condSource = getSingleSource(nodeIncoming, IF_HANDLES.cond)
        const thenSource = getSingleSource(nodeIncoming, IF_HANDLES.then)
        const elseSource = getSingleSource(nodeIncoming, IF_HANDLES.else)
        if (!condSource || !thenSource || !elseSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const cond = build(condSource)
        const thenExpr = build(thenSource)
        const elseExpr = build(elseSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!cond || !thenExpr || !elseExpr) return null
        return { op: 'if', cond, then: thenExpr, else: elseExpr }
      }

      // and / or — variadic
      const count = node.data?.inputCount ?? 2
      const args: ExprNode[] = []
      for (let i = 0; i < count; i++) {
        const src = getSingleSource(nodeIncoming, variadicHandleId(i))
        if (!src) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const built = build(src)
        if (!built) { visiting.delete(nodeId); visited.add(nodeId); return null }
        args.push(built)
      }
      visiting.delete(nodeId)
      visited.add(nodeId)
      return { op: logicOp, args } as ExprNode
    }

    if (node.type === 'math') {
      const mathOp = node.data?.mathOp
      if (!mathOp) { visiting.delete(nodeId); visited.add(nodeId); return null }

      // Unary
      if (['abs', 'round', 'floor', 'ceil'].includes(mathOp)) {
        const argSource = getSingleSource(nodeIncoming, 'a')
        if (!argSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const arg = build(argSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!arg) return null
        return { op: mathOp, arg } as ExprNode
      }

      // Binary
      if (mathOp === 'mod' || mathOp === 'pow') {
        const leftSource = getSingleSource(nodeIncoming, INPUT_HANDLES[0])
        const rightSource = getSingleSource(nodeIncoming, INPUT_HANDLES[1])
        if (!leftSource || !rightSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const left = build(leftSource)
        const right = build(rightSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!left || !right) return null
        return { op: mathOp, left, right } as ExprNode
      }

      // Variadic: min, max
      if (mathOp === 'min' || mathOp === 'max') {
        const count = node.data?.inputCount ?? 2
        const args: ExprNode[] = []
        for (let i = 0; i < count; i++) {
          const src = getSingleSource(nodeIncoming, variadicHandleId(i))
          if (!src) { visiting.delete(nodeId); visited.add(nodeId); return null }
          const built = build(src)
          if (!built) { visiting.delete(nodeId); visited.add(nodeId); return null }
          args.push(built)
        }
        visiting.delete(nodeId)
        visited.add(nodeId)
        return { op: mathOp, args } as ExprNode
      }

      // Ternary: clamp
      if (mathOp === 'clamp') {
        const valueSource = getSingleSource(nodeIncoming, CLAMP_HANDLES.value)
        const minSource = getSingleSource(nodeIncoming, CLAMP_HANDLES.min)
        const maxSource = getSingleSource(nodeIncoming, CLAMP_HANDLES.max)
        if (!valueSource || !minSource || !maxSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const value = build(valueSource)
        const min = build(minSource)
        const max = build(maxSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!value || !min || !max) return null
        return { op: 'clamp', value, min, max }
      }

      visiting.delete(nodeId)
      visited.add(nodeId)
      return null
    }

    if (node.type === 'string') {
      const stringOp = node.data?.stringOp
      if (!stringOp) { visiting.delete(nodeId); visited.add(nodeId); return null }

      // Unary
      if (['length', 'trim', 'toUpper', 'toLower'].includes(stringOp)) {
        const argSource = getSingleSource(nodeIncoming, 'a')
        if (!argSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const arg = build(argSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!arg) return null
        return { op: stringOp, arg } as ExprNode
      }

      // Binary: includes
      if (stringOp === 'includes') {
        const leftSource = getSingleSource(nodeIncoming, INPUT_HANDLES[0])
        const rightSource = getSingleSource(nodeIncoming, INPUT_HANDLES[1])
        if (!leftSource || !rightSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const left = build(leftSource)
        const right = build(rightSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!left || !right) return null
        return { op: 'includes', left, right }
      }

      // Variadic: concat
      if (stringOp === 'concat') {
        const count = node.data?.inputCount ?? 2
        const args: ExprNode[] = []
        for (let i = 0; i < count; i++) {
          const src = getSingleSource(nodeIncoming, variadicHandleId(i))
          if (!src) { visiting.delete(nodeId); visited.add(nodeId); return null }
          const built = build(src)
          if (!built) { visiting.delete(nodeId); visited.add(nodeId); return null }
          args.push(built)
        }
        visiting.delete(nodeId)
        visited.add(nodeId)
        return { op: 'concat', args } as ExprNode
      }

      // Ternary: slice
      if (stringOp === 'slice') {
        const valueSource = getSingleSource(nodeIncoming, SLICE_HANDLES.value)
        const startSource = getSingleSource(nodeIncoming, SLICE_HANDLES.start)
        const endSource = getSingleSource(nodeIncoming, SLICE_HANDLES.end)
        if (!valueSource || !startSource || !endSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const value = build(valueSource)
        const start = build(startSource)
        const end = build(endSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!value || !start || !end) return null
        return { op: 'slice', value, start, end }
      }

      // Regex: 1 input + pattern/flags from node data
      if (stringOp === 'regex') {
        const argSource = getSingleSource(nodeIncoming, 'a')
        if (!argSource) { visiting.delete(nodeId); visited.add(nodeId); return null }
        const value = build(argSource)
        visiting.delete(nodeId)
        visited.add(nodeId)
        if (!value) return null
        const pattern = node.data?.pattern ?? ''
        if (!pattern) return null
        return { op: 'regex', value, pattern, flags: node.data?.flags }
      }

      visiting.delete(nodeId)
      visited.add(nodeId)
      return null
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
  return { x: depth * 280, y: row * 140 }
}

/**
 * Center each node vertically between its input nodes.
 * The current sequential row assignment places every parent at the top of
 * its subtree, causing all its input edges to fan downward and overlap.
 * Sorting left-to-right (by x) and averaging source y-positions fixes this
 * in one linear pass because inputs are always further left than their target.
 */
function centerNodesBetweenInputs(
  nodes: ExprFlowNode[],
  edges: Edge[],
): ExprFlowNode[] {
  // Map each target node id → ids of its source nodes
  const sourcesOf = new Map<string, string[]>()
  for (const edge of edges) {
    const existing = sourcesOf.get(edge.target) ?? []
    existing.push(edge.source)
    sourcesOf.set(edge.target, existing)
  }

  const positionById = new Map(nodes.map((n) => [n.id, { ...n.position }]))

  // Process left-to-right so inputs are already settled when we center their target
  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x)

  for (const node of sorted) {
    const sources = sourcesOf.get(node.id)
    if (!sources || sources.length === 0) continue
    const avgY =
      sources.reduce((sum, sid) => sum + (positionById.get(sid)?.y ?? 0), 0) /
      sources.length
    positionById.set(node.id, { ...positionById.get(node.id)!, y: avgY })
  }

  return nodes.map((n) => ({ ...n, position: positionById.get(n.id)! }))
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

/** Clamp ExprNode to use when a required input is missing during graph reconstruction. */
const PLACEHOLDER: ExprNode = { op: 'const', value: 0 }

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
      nodes.push({ id, type: 'field', position, data: { fieldId: node.fieldId } })
      return id
    }

    if (node.op === 'const') {
      nodes.push({ id, type: 'const', position, data: { value: String(node.value ?? '') } })
      return id
    }

    if (node.op === 'accumulate') {
      const acc = node as Extract<ExprNode, { op: 'accumulate' }>
      const fieldId = nextId()
      const fieldPosition = placeNode(depth + 1, row)
      row += 1
      depthById.set(fieldId, depth + 1)
      nodes.push({ id: fieldId, type: 'field', position: fieldPosition, data: { fieldId: acc.sourceFieldId } })
      nodes.push({
        id,
        type: 'accumulator',
        position,
        data: { accumulatorKind: 'accumulate', startIndex: acc.startIndex, endIndex: acc.endIndex, increment: acc.increment, action: acc.action },
      })
      edges.push({ id: `${fieldId}-${id}-source`, source: fieldId, target: id, targetHandle: ACCUMULATOR_SOURCE_HANDLE })
      return id
    }

    if (node.op === 'sum') {
      const sumNode = node as Extract<ExprNode, { op: 'sum' }>
      const fieldId = nextId()
      const fieldPosition = placeNode(depth + 1, row)
      row += 1
      depthById.set(fieldId, depth + 1)
      nodes.push({ id: fieldId, type: 'field', position: fieldPosition, data: { fieldId: sumNode.sourceFieldId } })
      nodes.push({
        id,
        type: 'accumulator',
        position,
        data: { accumulatorKind: 'sum', startIndex: sumNode.startIndex, endIndex: sumNode.endIndex, increment: sumNode.increment, initialValue: sumNode.initialValue },
      })
      edges.push({ id: `${fieldId}-${id}-source`, source: fieldId, target: id, targetHandle: ACCUMULATOR_SOURCE_HANDLE })
      return id
    }

    if (node.op === 'count') {
      const countNode = node as Extract<ExprNode, { op: 'count' }>
      const fieldId = nextId()
      const fieldPosition = placeNode(depth + 1, row)
      row += 1
      depthById.set(fieldId, depth + 1)
      nodes.push({ id: fieldId, type: 'field', position: fieldPosition, data: { fieldId: countNode.sourceFieldId } })
      nodes.push({ id, type: 'accumulator', position, data: { accumulatorKind: 'count' } })
      edges.push({ id: `${fieldId}-${id}-source`, source: fieldId, target: id, targetHandle: ACCUMULATOR_SOURCE_HANDLE })
      return id
    }

    if (node.op === 'add' || node.op === 'mul') {
      const pair = splitBinary(node.op, node)
      const left = pair?.left ?? PLACEHOLDER
      const right = pair?.right ?? PLACEHOLDER
      nodes.push({ id, type: 'op', position, data: { op: node.op } })
      const leftId = build(left, depth + 1)
      const rightId = build(right, depth + 1)
      edges.push(
        { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
        { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
      )
      return id
    }

    // Existing binary ops (sub, div, comparisons)
    if (['sub', 'div', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(node.op)) {
      nodes.push({ id, type: 'op', position, data: { op: node.op as ExprFlowOperator } })
      const binary = node as ExprNode & { left?: ExprNode; right?: ExprNode; args?: ExprNode[] }
      const left = binary.left ?? binary.args?.[0] ?? PLACEHOLDER
      const right = binary.right ?? binary.args?.[1] ?? PLACEHOLDER
      const leftId = build(left, depth + 1)
      const rightId = build(right, depth + 1)
      edges.push(
        { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
        { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
      )
      return id
    }

    // Logic: not
    if (node.op === 'not') {
      nodes.push({ id, type: 'logic', position, data: { logicOp: 'not' } })
      const argId = build(node.arg ?? PLACEHOLDER, depth + 1)
      edges.push({ id: `${argId}-${id}-a`, source: argId, target: id, targetHandle: 'a' })
      return id
    }

    // Logic: if
    if (node.op === 'if') {
      nodes.push({ id, type: 'logic', position, data: { logicOp: 'if' } })
      const condId = build(node.cond ?? PLACEHOLDER, depth + 1)
      const thenId = build(node.then ?? PLACEHOLDER, depth + 1)
      const elseId = build(node.else ?? PLACEHOLDER, depth + 1)
      edges.push(
        { id: `${condId}-${id}-cond`, source: condId, target: id, targetHandle: IF_HANDLES.cond },
        { id: `${thenId}-${id}-then`, source: thenId, target: id, targetHandle: IF_HANDLES.then },
        { id: `${elseId}-${id}-else`, source: elseId, target: id, targetHandle: IF_HANDLES.else },
      )
      return id
    }

    // Logic: and / or (variadic)
    if (node.op === 'and' || node.op === 'or') {
      const args = (node as Extract<ExprNode, { op: 'and' | 'or' }>).args ?? [PLACEHOLDER, PLACEHOLDER]
      const count = Math.max(args.length, 2)
      nodes.push({ id, type: 'logic', position, data: { logicOp: node.op, inputCount: count } })
      for (let i = 0; i < count; i++) {
        const argId = build(args[i] ?? PLACEHOLDER, depth + 1)
        edges.push({ id: `${argId}-${id}-arg${i}`, source: argId, target: id, targetHandle: variadicHandleId(i) })
      }
      return id
    }

    // Math: unary (abs, round, floor, ceil)
    if (['abs', 'round', 'floor', 'ceil'].includes(node.op)) {
      const unaryNode = node as Extract<ExprNode, { op: 'abs' | 'round' | 'floor' | 'ceil' }>
      nodes.push({ id, type: 'math', position, data: { mathOp: node.op as MathOp } })
      const argId = build(unaryNode.arg ?? PLACEHOLDER, depth + 1)
      edges.push({ id: `${argId}-${id}-a`, source: argId, target: id, targetHandle: 'a' })
      return id
    }

    // Math: binary (mod, pow)
    if (node.op === 'mod' || node.op === 'pow') {
      const binaryNode = node as Extract<ExprNode, { op: 'mod' | 'pow' }>
      nodes.push({ id, type: 'math', position, data: { mathOp: node.op } })
      const leftId = build(binaryNode.left ?? PLACEHOLDER, depth + 1)
      const rightId = build(binaryNode.right ?? PLACEHOLDER, depth + 1)
      edges.push(
        { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
        { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
      )
      return id
    }

    // Math: variadic (min, max)
    if (node.op === 'min' || node.op === 'max') {
      const varNode = node as Extract<ExprNode, { op: 'min' | 'max' }>
      const args = varNode.args ?? [PLACEHOLDER, PLACEHOLDER]
      const count = Math.max(args.length, 2)
      nodes.push({ id, type: 'math', position, data: { mathOp: node.op, inputCount: count } })
      for (let i = 0; i < count; i++) {
        const argId = build(args[i] ?? PLACEHOLDER, depth + 1)
        edges.push({ id: `${argId}-${id}-arg${i}`, source: argId, target: id, targetHandle: variadicHandleId(i) })
      }
      return id
    }

    // Math: ternary (clamp)
    if (node.op === 'clamp') {
      nodes.push({ id, type: 'math', position, data: { mathOp: 'clamp' } })
      const valueId = build(node.value ?? PLACEHOLDER, depth + 1)
      const minId = build(node.min ?? PLACEHOLDER, depth + 1)
      const maxId = build(node.max ?? PLACEHOLDER, depth + 1)
      edges.push(
        { id: `${valueId}-${id}-value`, source: valueId, target: id, targetHandle: CLAMP_HANDLES.value },
        { id: `${minId}-${id}-min`, source: minId, target: id, targetHandle: CLAMP_HANDLES.min },
        { id: `${maxId}-${id}-max`, source: maxId, target: id, targetHandle: CLAMP_HANDLES.max },
      )
      return id
    }

    // String: unary (length, trim, toUpper, toLower)
    if (['length', 'trim', 'toUpper', 'toLower'].includes(node.op)) {
      const unaryNode = node as Extract<ExprNode, { op: 'length' | 'trim' | 'toUpper' | 'toLower' }>
      nodes.push({ id, type: 'string', position, data: { stringOp: node.op as StringOp } })
      const argId = build(unaryNode.arg ?? PLACEHOLDER, depth + 1)
      edges.push({ id: `${argId}-${id}-a`, source: argId, target: id, targetHandle: 'a' })
      return id
    }

    // String: binary (includes)
    if (node.op === 'includes') {
      nodes.push({ id, type: 'string', position, data: { stringOp: 'includes' } })
      const leftId = build(node.left ?? PLACEHOLDER, depth + 1)
      const rightId = build(node.right ?? PLACEHOLDER, depth + 1)
      edges.push(
        { id: `${leftId}-${id}-a`, source: leftId, target: id, targetHandle: INPUT_HANDLES[0] },
        { id: `${rightId}-${id}-b`, source: rightId, target: id, targetHandle: INPUT_HANDLES[1] },
      )
      return id
    }

    // String: variadic (concat)
    if (node.op === 'concat') {
      const concatNode = node as Extract<ExprNode, { op: 'concat' }>
      const args = concatNode.args ?? [PLACEHOLDER, PLACEHOLDER]
      const count = Math.max(args.length, 2)
      nodes.push({ id, type: 'string', position, data: { stringOp: 'concat', inputCount: count } })
      for (let i = 0; i < count; i++) {
        const argId = build(args[i] ?? PLACEHOLDER, depth + 1)
        edges.push({ id: `${argId}-${id}-arg${i}`, source: argId, target: id, targetHandle: variadicHandleId(i) })
      }
      return id
    }

    // String: ternary (slice)
    if (node.op === 'slice') {
      nodes.push({ id, type: 'string', position, data: { stringOp: 'slice' } })
      const valueId = build(node.value ?? PLACEHOLDER, depth + 1)
      const startId = build(node.start ?? PLACEHOLDER, depth + 1)
      const endId = build(node.end ?? PLACEHOLDER, depth + 1)
      edges.push(
        { id: `${valueId}-${id}-a`, source: valueId, target: id, targetHandle: SLICE_HANDLES.value },
        { id: `${startId}-${id}-start`, source: startId, target: id, targetHandle: SLICE_HANDLES.start },
        { id: `${endId}-${id}-end`, source: endId, target: id, targetHandle: SLICE_HANDLES.end },
      )
      return id
    }

    // String: regex (1 input + config)
    if (node.op === 'regex') {
      nodes.push({ id, type: 'string', position, data: { stringOp: 'regex', pattern: node.pattern, flags: node.flags } })
      const valueId = build(node.value ?? PLACEHOLDER, depth + 1)
      edges.push({ id: `${valueId}-${id}-a`, source: valueId, target: id, targetHandle: 'a' })
      return id
    }

    // Fallback for unknown ops — render as const placeholder
    nodes.push({ id, type: 'const', position, data: { value: '' } })
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
      return { ...node, position: { ...node.position, x: maxDepth * 280 } }
    }
    const depth = depthById.get(node.id) ?? 1
    return { ...node, position: { ...node.position, x: (maxDepth - depth) * 280 } }
  })

  return { nodes: centerNodesBetweenInputs(orientedNodes, edges), edges }
}

export const FLOW_CONSTANTS = {
  RESULT_HANDLE_ID,
  INPUT_HANDLES,
  ACCUMULATOR_SOURCE_HANDLE,
  IF_HANDLES,
  CLAMP_HANDLES,
  SLICE_HANDLES,
}
