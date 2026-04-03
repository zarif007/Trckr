// lib/field-rules/extract-field-refs.ts

import type { ExprNode } from "@/lib/functions/types";

/**
 * Walks an expression AST and returns the deduplicated set of field paths
 * referenced via `{ op: 'field', fieldId }` nodes (format: "gridId.fieldId").
 *
 * Used to auto-detect which fields an onFieldChange rule depends on, so the
 * editor can display a human-readable "Watching: fieldA, fieldB" summary.
 */
export function extractFieldRefsFromExpr(
  expr: ExprNode | undefined | null,
): string[] {
  if (!expr) return [];
  const refs = new Set<string>();
  walkNode(expr, refs);
  return Array.from(refs);
}

function walkNode(node: ExprNode, refs: Set<string>): void {
  if (!node || typeof node !== "object") return;

  switch (node.op) {
    case "field":
      refs.add(node.fieldId);
      return;

    case "const":
      return;

    // n-ary: args array
    case "add":
    case "mul":
    case "and":
    case "or":
    case "min":
    case "max":
    case "concat":
      for (const arg of node.args) walkNode(arg, refs);
      return;

    // binary: left + right
    case "sub":
    case "div":
    case "mod":
    case "pow":
    case "includes":
    case "eq":
    case "neq":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "=":
    case "==":
    case "===":
    case "!=":
    case "!==":
    case ">":
    case ">=":
    case "<":
    case "<=":
      walkNode(node.left, refs);
      walkNode(node.right, refs);
      return;

    // unary: arg
    case "not":
    case "abs":
    case "round":
    case "floor":
    case "ceil":
    case "length":
    case "trim":
    case "toUpper":
    case "toLower":
      walkNode(node.arg, refs);
      return;

    // ternary: cond/then/else
    case "if":
      walkNode(node.cond, refs);
      walkNode(node.then, refs);
      walkNode(node.else, refs);
      return;

    // regex: value only (pattern is a literal string)
    case "regex":
      walkNode(node.value, refs);
      return;

    // clamp: value + min + max
    case "clamp":
      walkNode(node.value, refs);
      walkNode(node.min, refs);
      walkNode(node.max, refs);
      return;

    // slice: value + start + end
    case "slice":
      walkNode(node.value, refs);
      walkNode(node.start, refs);
      walkNode(node.end, refs);
      return;

    // accumulate/sum/count: cross-row aggregates — not same-row field watches
    case "accumulate":
    case "sum":
    case "count":
      return;
  }
}
