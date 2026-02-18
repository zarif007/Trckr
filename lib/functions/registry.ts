import type { ExprNode, FunctionContext } from './types'

export type ExprEvaluator = (
  node: ExprNode,
  ctx: FunctionContext,
  evalNode: (node: ExprNode) => unknown
) => unknown

const exprRegistry = new Map<string, ExprEvaluator>()

export function registerExprOp(op: string, evaluator: ExprEvaluator) {
  exprRegistry.set(op, evaluator)
}

export function getExprOp(op: string): ExprEvaluator | undefined {
  return exprRegistry.get(op)
}

export function getRegisteredExprOps(): string[] {
  return Array.from(exprRegistry.keys())
}
