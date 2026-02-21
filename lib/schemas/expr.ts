import { z } from 'zod'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprOp } from '@/lib/functions/normalize'

export type ExprSchemaType = z.ZodType<ExprNode>

export const exprSchema: ExprSchemaType = z.lazy(() => {
  const constNode = z.object({
    op: z.literal('const'),
    value: z.any(),
  })

  const fieldNode = z.object({
    op: z.literal('field'),
    fieldId: z.string(),
  })

  const variadic = (op: 'add' | 'mul') =>
    z.union([
      z
        .object({
          op: z.literal(op),
          args: z.array(exprSchema).min(1),
        })
        .passthrough(),
      z
        .object({
          op: z.literal(op),
          left: exprSchema,
          right: exprSchema,
        })
        .passthrough(),
    ])

  const binary = (op: string) =>
    z.union([
      z
        .object({
          op: z.literal(op),
          left: exprSchema,
          right: exprSchema,
        })
        .passthrough(),
      z
        .object({
          op: z.literal(op),
          args: z.array(exprSchema).min(2).max(2),
        })
        .passthrough(),
    ])

  return z.union([
    constNode,
    fieldNode,
    variadic('add'),
    variadic('mul'),
    binary('sub'),
    binary('div'),
    binary('eq'),
    binary('neq'),
    binary('gt'),
    binary('gte'),
    binary('lt'),
    binary('lte'),
    binary('='),
    binary('=='),
    binary('==='),
    binary('!='),
    binary('!=='),
    binary('>'),
    binary('>='),
    binary('<'),
    binary('<='),
  ])
})

export const exprOutputSchema = z.object({
  expr: exprSchema,
})

type BinaryOp = 'sub' | 'div' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

const binaryOps = new Set<BinaryOp>([
  'sub',
  'div',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
])

function getBinaryOperands(node: ExprNode): { left: ExprNode; right: ExprNode } | null {
  const maybe = node as ExprNode & { left?: ExprNode; right?: ExprNode; args?: ExprNode[] }
  if (maybe.left && maybe.right) return { left: maybe.left, right: maybe.right }
  if (Array.isArray(maybe.args) && maybe.args.length >= 2) {
    return { left: maybe.args[0], right: maybe.args[1] }
  }
  return null
}

function normalizeVariadicArgs(op: 'add' | 'mul', args: ExprNode[]): ExprNode[] {
  const normalized = args.map((arg) => normalizeExprNode(arg))
  const flattened: ExprNode[] = []
  for (const arg of normalized) {
    if (arg.op === op && Array.isArray((arg as { args?: ExprNode[] }).args)) {
      flattened.push(...((arg as { args?: ExprNode[] }).args ?? []))
    } else {
      flattened.push(arg)
    }
  }
  return flattened
}

export function normalizeExprNode(node: ExprNode): ExprNode {
  const normalizedOp = normalizeExprOp(node.op)
  const normalized = (normalizedOp === node.op ? node : { ...node, op: normalizedOp }) as ExprNode

  if (normalized.op === 'const' || normalized.op === 'field') return normalized

  if (normalized.op === 'add' || normalized.op === 'mul') {
    const existingArgs = (normalized as { args?: ExprNode[] }).args
    const pair = getBinaryOperands(normalized)
    const args = Array.isArray(existingArgs)
      ? existingArgs
      : pair
        ? [pair.left, pair.right]
        : []
    return {
      op: normalized.op,
      args: normalizeVariadicArgs(normalized.op, args),
    } as ExprNode
  }

  if (binaryOps.has(normalized.op as BinaryOp)) {
    const pair = getBinaryOperands(normalized)
    if (!pair) return normalized
    return {
      op: normalized.op,
      left: normalizeExprNode(pair.left),
      right: normalizeExprNode(pair.right),
    } as ExprNode
  }

  return normalized
}
