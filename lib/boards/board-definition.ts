import { z } from "zod";

export const BOARD_DEFINITION_VERSION = 1 as const;

const boardLayoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(1000),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
});

const boardSourceSchema = z.object({
  trackerSchemaId: z.string().min(1),
  gridId: z.string().min(1),
  fieldIds: z.array(z.string()).default([]),
});

const statAggregateSchema = z.enum(["count", "sum", "avg"]);

const statElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("stat"),
  title: z.string().max(200).optional(),
  layout: boardLayoutSchema,
  source: boardSourceSchema,
  aggregate: statAggregateSchema,
});

const tableElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("table"),
  title: z.string().max(200).optional(),
  layout: boardLayoutSchema,
  source: boardSourceSchema,
  /** Max rows to return (capped server-side). */
  maxRows: z.number().int().min(1).max(100).optional(),
});

const chartKindSchema = z.enum(["bar", "line"]);

const chartElementSchema = z.object({
  id: z.string().min(1),
  type: z.literal("chart"),
  title: z.string().max(200).optional(),
  layout: boardLayoutSchema,
  source: boardSourceSchema.extend({
    /** Category axis: field id present on each row. */
    groupByFieldId: z.string().min(1),
    /** If set, sum this field per group; otherwise count rows per group. */
    metricFieldId: z.string().optional(),
  }),
  chartKind: chartKindSchema.default("bar"),
});

const boardElementSchema = z.discriminatedUnion("type", [
  statElementSchema,
  tableElementSchema,
  chartElementSchema,
]);

export const boardDefinitionSchema = z.object({
  version: z.literal(BOARD_DEFINITION_VERSION).default(BOARD_DEFINITION_VERSION),
  elements: z.array(boardElementSchema).default([]),
});

export type BoardDefinition = z.infer<typeof boardDefinitionSchema>;
export type BoardElement = z.infer<typeof boardElementSchema>;
export type BoardLayout = z.infer<typeof boardLayoutSchema>;
export type StatAggregate = z.infer<typeof statAggregateSchema>;

export const emptyBoardDefinition = (): BoardDefinition => ({
  version: BOARD_DEFINITION_VERSION,
  elements: [],
});

export function parseBoardDefinition(raw: unknown): BoardDefinition {
  const parsed = boardDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return emptyBoardDefinition();
  }
  return parsed.data;
}

export function safeParseBoardDefinition(
  raw: unknown,
): { ok: true; data: BoardDefinition } | { ok: false; error: string } {
  const parsed = boardDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { ok: true, data: parsed.data };
}
