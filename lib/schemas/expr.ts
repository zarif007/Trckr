import { z } from "zod";
import type { ExprNode } from "@/lib/functions/types";
import { normalizeExprOp } from "@/lib/functions/normalize";

export type ExprSchemaType = z.ZodType<ExprNode>;

export const exprSchema: ExprSchemaType = z.lazy(() => {
  const constNode = z.object({
    op: z.literal("const"),
    value: z.any(),
  });

  const fieldNode = z.object({
    op: z.literal("field"),
    fieldId: z.string(),
  });

  const accumulateNode = z
    .object({
      op: z.literal("accumulate"),
      sourceFieldId: z.string(),
      startIndex: z.number().optional(),
      endIndex: z.number().optional(),
      increment: z.number().optional(),
      action: z.enum(["add", "sub", "mul"]),
      initialValue: z.number().optional(),
    })
    .passthrough();

  const sumNode = z
    .object({
      op: z.literal("sum"),
      sourceFieldId: z.string(),
      startIndex: z.number().optional(),
      endIndex: z.number().optional(),
      increment: z.number().optional(),
      initialValue: z.number().optional(),
    })
    .passthrough();

  const countNode = z.object({
    op: z.literal("count"),
    sourceFieldId: z.string(),
  });

  const variadic = (op: string) =>
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
    ]);

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
    ]);

  const unary = (op: string) =>
    z
      .object({
        op: z.literal(op),
        arg: exprSchema,
      })
      .passthrough();

  const andOrNode = (op: "and" | "or") =>
    z.union([
      z
        .object({ op: z.literal(op), args: z.array(exprSchema).min(1) })
        .passthrough(),
      z
        .object({ op: z.literal(op), left: exprSchema, right: exprSchema })
        .passthrough(),
    ]);

  const notNode = z
    .object({ op: z.literal("not"), arg: exprSchema })
    .passthrough();

  const ifNode = z
    .object({
      op: z.literal("if"),
      cond: exprSchema,
      then: exprSchema,
      else: exprSchema,
    })
    .passthrough();

  const regexNode = z
    .object({
      op: z.literal("regex"),
      value: exprSchema,
      pattern: z.string(),
      flags: z.string().optional(),
    })
    .passthrough();

  // Math function nodes
  const clampNode = z
    .object({
      op: z.literal("clamp"),
      value: exprSchema,
      min: exprSchema,
      max: exprSchema,
    })
    .passthrough();

  const sliceNode = z
    .object({
      op: z.literal("slice"),
      value: exprSchema,
      start: exprSchema,
      end: exprSchema,
    })
    .passthrough();

  return z
    .union([
      constNode,
      fieldNode,
      accumulateNode,
      sumNode,
      countNode,
      variadic("add"),
      variadic("mul"),
      variadic("min"),
      variadic("max"),
      variadic("concat"),
      binary("sub"),
      binary("div"),
      binary("mod"),
      binary("pow"),
      binary("includes"),
      binary("eq"),
      binary("neq"),
      binary("gt"),
      binary("gte"),
      binary("lt"),
      binary("lte"),
      binary("="),
      binary("=="),
      binary("==="),
      binary("!="),
      binary("!=="),
      binary(">"),
      binary(">="),
      binary("<"),
      binary("<="),
      andOrNode("and"),
      andOrNode("or"),
      notNode,
      ifNode,
      regexNode,
      clampNode,
      sliceNode,
      unary("abs"),
      unary("round"),
      unary("floor"),
      unary("ceil"),
      unary("length"),
      unary("trim"),
      unary("toUpper"),
      unary("toLower"),
    ])
    .transform((val): ExprNode => normalizeExprNode(val as ExprNode));
});

export const exprOutputSchema = z.object({
  expr: exprSchema,
});

type BinaryOp =
  | "sub"
  | "div"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "mod"
  | "pow"
  | "includes";
type UnaryOp =
  | "not"
  | "abs"
  | "round"
  | "floor"
  | "ceil"
  | "length"
  | "trim"
  | "toUpper"
  | "toLower";
type VariadicOp = "add" | "mul" | "and" | "or" | "min" | "max" | "concat";

const binaryOps = new Set<BinaryOp>([
  "sub",
  "div",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "mod",
  "pow",
  "includes",
]);

const unaryOps = new Set<UnaryOp>([
  "not",
  "abs",
  "round",
  "floor",
  "ceil",
  "length",
  "trim",
  "toUpper",
  "toLower",
]);

const variadicOps = new Set<VariadicOp>([
  "add",
  "mul",
  "and",
  "or",
  "min",
  "max",
  "concat",
]);

function getBinaryOperands(
  node: ExprNode,
): { left: ExprNode; right: ExprNode } | null {
  const maybe = node as ExprNode & {
    left?: ExprNode;
    right?: ExprNode;
    args?: ExprNode[];
  };
  if (maybe.left && maybe.right)
    return { left: maybe.left, right: maybe.right };
  if (Array.isArray(maybe.args) && maybe.args.length >= 2) {
    return { left: maybe.args[0], right: maybe.args[1] };
  }
  return null;
}

function normalizeVariadicArgs(
  op: "add" | "mul",
  args: ExprNode[],
): ExprNode[] {
  const normalized = args.map((arg) => normalizeExprNode(arg));
  const flattened: ExprNode[] = [];
  for (const arg of normalized) {
    if (arg.op === op && Array.isArray((arg as { args?: ExprNode[] }).args)) {
      flattened.push(...((arg as { args?: ExprNode[] }).args ?? []));
    } else {
      flattened.push(arg);
    }
  }
  return flattened;
}

export function normalizeExprNode(node: ExprNode): ExprNode {
  const normalizedOp = normalizeExprOp(node.op);
  const normalized = (
    normalizedOp === node.op ? node : { ...node, op: normalizedOp }
  ) as ExprNode;

  if (
    normalized.op === "const" ||
    normalized.op === "field" ||
    normalized.op === "accumulate" ||
    normalized.op === "sum" ||
    normalized.op === "count"
  )
    return normalized;

  if (variadicOps.has(normalized.op as VariadicOp)) {
    const existingArgs = (normalized as { args?: ExprNode[] }).args;
    const pair = getBinaryOperands(normalized);
    const args = Array.isArray(existingArgs)
      ? existingArgs
      : pair
        ? [pair.left, pair.right]
        : [];
    const op = normalized.op as VariadicOp;
    // Only flatten for add/mul (not and/or/min/max/concat)
    const normalizedArgs =
      op === "add" || op === "mul"
        ? normalizeVariadicArgs(op, args)
        : args.map((a) => normalizeExprNode(a));
    return { op, args: normalizedArgs } as ExprNode;
  }

  if (binaryOps.has(normalized.op as BinaryOp)) {
    const pair = getBinaryOperands(normalized);
    if (!pair) return normalized;
    return {
      op: normalized.op,
      left: normalizeExprNode(pair.left),
      right: normalizeExprNode(pair.right),
    } as ExprNode;
  }

  if (unaryOps.has(normalized.op as UnaryOp)) {
    const maybe = normalized as ExprNode & { arg?: ExprNode };
    if (!maybe.arg) return normalized;
    return { op: normalized.op, arg: normalizeExprNode(maybe.arg) } as ExprNode;
  }

  if (normalized.op === "if") {
    const ifNode = normalized as Extract<ExprNode, { op: "if" }>;
    return {
      op: "if",
      cond: normalizeExprNode(ifNode.cond),
      then: normalizeExprNode(ifNode.then),
      else: normalizeExprNode(ifNode.else),
    };
  }

  if (normalized.op === "regex") {
    const regexNode = normalized as Extract<ExprNode, { op: "regex" }>;
    return {
      op: "regex",
      value: normalizeExprNode(regexNode.value),
      pattern: regexNode.pattern,
      flags: regexNode.flags,
    };
  }

  if (normalized.op === "clamp") {
    const clampNode = normalized as Extract<ExprNode, { op: "clamp" }>;
    return {
      op: "clamp",
      value: normalizeExprNode(clampNode.value),
      min: normalizeExprNode(clampNode.min),
      max: normalizeExprNode(clampNode.max),
    };
  }

  if (normalized.op === "slice") {
    const sliceNode = normalized as Extract<ExprNode, { op: "slice" }>;
    return {
      op: "slice",
      value: normalizeExprNode(sliceNode.value),
      start: normalizeExprNode(sliceNode.start),
      end: normalizeExprNode(sliceNode.end),
    };
  }

  return normalized;
}
