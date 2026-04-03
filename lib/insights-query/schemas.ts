import { z } from "zod";

/**
 * JSON values models reliably emit for structured output (query/formatter filter values).
 */
export const structuredJsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
]);

export const comparisonOpSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "starts_with",
  "in",
]);

export type ComparisonOp = z.infer<typeof comparisonOpSchema>;

export const timePresetSchema = z.enum([
  "all",
  "last_7_days",
  "last_30_days",
  "last_month",
  "last_calendar_month",
]);

export const formatterValueRefSchema = z.union([
  z.object({ path: z.string() }),
  z.object({ num: z.number() }),
]);

export type FormatterValueRef = z.infer<typeof formatterValueRefSchema>;

export const formatterComputeExpressionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("binary"),
    fn: z.enum(["add", "subtract", "multiply", "divide"]),
    left: formatterValueRefSchema,
    right: formatterValueRefSchema,
  }),
  z.object({
    kind: z.literal("unary"),
    fn: z.enum(["abs", "neg", "round", "ceil", "floor"]),
    of: formatterValueRefSchema,
    decimals: z.number().int().min(0).max(10).optional(),
  }),
  z.object({
    kind: z.literal("percent"),
    part: formatterValueRefSchema,
    whole: formatterValueRefSchema,
    scale: z.number().optional(),
  }),
]);

export type FormatterComputeExpression = z.infer<
  typeof formatterComputeExpressionSchema
>;

export const aggregateMetricSchema = z
  .object({
    name: z.string(),
    op: z.enum(["sum", "count", "avg", "min", "max"]),
    path: z.string().optional(),
    expression: formatterComputeExpressionSchema.optional(),
  })
  .superRefine((m, ctx) => {
    if (m.op === "count") {
      if (m.expression != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "count metric must not use expression",
        });
      }
      return;
    }
    const hasPath = typeof m.path === "string" && m.path.length > 0;
    const hasExpr = m.expression != null;
    if (hasPath === hasExpr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "For sum/avg/min/max provide exactly one of path or expression (e.g. line total = multiply quantity × unit_price).",
      });
    }
  });

export type AggregateMetric = z.infer<typeof aggregateMetricSchema>;

export const rowTimeFilterSchema = z.object({
  field: z.enum(["createdAt", "updatedAt"]),
  preset: timePresetSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const queryPlanV1Schema = z.object({
  version: z.literal(1),
  load: z.object({
    maxTrackerDataRows: z.coerce.number().int().min(1).max(5000).default(500),
    branchName: z.string().nullable().optional(),
    rowTimeFilter: rowTimeFilterSchema.optional(),
  }),
  flatten: z.object({
    gridIds: z
      .array(z.string())
      .describe("Empty = all grids that have row arrays in data."),
  }),
  filter: z
    .array(
      z.object({
        path: z.string(),
        op: comparisonOpSchema,
        value: structuredJsonValueSchema,
      }),
    )
    .default([]),
  aggregate: z
    .object({
      groupBy: z.array(z.string()),
      metrics: z.array(aggregateMetricSchema),
    })
    .optional(),
  sort: z
    .array(
      z.object({
        path: z.string(),
        direction: z.enum(["asc", "desc"]),
      }),
    )
    .default([]),
  limit: z.number().int().min(1).max(10000).optional(),
});

export type QueryPlanV1 = z.infer<typeof queryPlanV1Schema>;

const formatterOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("drop_columns"),
    columns: z.array(z.string()),
  }),
  z.object({
    op: z.literal("filter"),
    path: z.string(),
    cmp: comparisonOpSchema,
    value: structuredJsonValueSchema,
  }),
  z.object({
    op: z.literal("sort"),
    path: z.string(),
    direction: z.enum(["asc", "desc"]),
  }),
  z.object({
    op: z.literal("rename"),
    map: z.record(z.string(), z.string()),
  }),
  z.object({
    op: z.literal("limit"),
    n: z.number().int().positive(),
  }),
  z.object({
    op: z.literal("group_by"),
    keys: z.array(z.string()),
    metrics: z.array(aggregateMetricSchema),
  }),
  z.object({
    op: z.literal("compute_column"),
    name: z.string().describe("New column name on each row."),
    expression: formatterComputeExpressionSchema,
  }),
]);

export const formatterPlanV1Schema = z.object({
  version: z.literal(1),
  outputStyle: z
    .preprocess(
      (v) =>
        v === "markdown_table" || v === "markdown_summary" || v === "both"
          ? v
          : "markdown_table",
      z.enum(["markdown_table", "markdown_summary", "both"]),
    )
    .default("markdown_table"),
  segmentMarkdownTablesByColumn: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined,
    z.string().optional(),
  ),
  ops: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(formatterOpSchema),
  ),
});

export type FormatterPlanV1 = z.infer<typeof formatterPlanV1Schema>;
export type FormatterOp = FormatterPlanV1["ops"][number];

export function parseQueryPlan(data: unknown): QueryPlanV1 | null {
  const r = queryPlanV1Schema.safeParse(data);
  return r.success ? r.data : null;
}

export function parseFormatterPlan(data: unknown): FormatterPlanV1 | null {
  const r = formatterPlanV1Schema.safeParse(data);
  return r.success ? r.data : null;
}
