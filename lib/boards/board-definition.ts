import { z } from "zod";

export const BOARD_DEFINITION_VERSION = 3 as const;

const boardSourceSchema = z.object({
  trackerSchemaId: z.string().min(1),
  gridId: z.string().min(1),
  fieldIds: z.array(z.string()).default([]),
});

// Layout positioning for grid-based widget placement
const boardElementLayoutSchema = z.object({
  id: z.string().min(1),
  placeId: z.number().int().min(0),
  title: z.string().max(200).optional(),
  row: z.number().int().min(0).default(0),
  col: z.number().int().min(0).max(11).default(0),
  colSpan: z.number().int().min(1).max(12).default(6),
  rowSpan: z.number().int().min(1).default(1),
});

const statAggregateSchema = z.enum(["count", "sum", "avg"]);

const statElementSchema = boardElementLayoutSchema.extend({
  type: z.literal("stat"),
  source: boardSourceSchema,
  aggregate: statAggregateSchema,
});

const tableElementSchema = boardElementLayoutSchema.extend({
  type: z.literal("table"),
  source: boardSourceSchema,
  /** Max rows to return (capped server-side). */
  maxRows: z.number().int().min(1).max(100).optional(),
});

const chartKindSchema = z.enum(["bar", "line"]);

const chartElementSchema = boardElementLayoutSchema.extend({
  type: z.literal("chart"),
  source: boardSourceSchema.extend({
    /** Category axis: field id present on each row. */
    groupByFieldId: z.string().min(1),
    /** If set, sum this field per group; otherwise count rows per group. */
    metricFieldId: z.string().optional(),
  }),
  chartKind: chartKindSchema.default("bar"),
});

const textElementSchema = boardElementLayoutSchema.extend({
  type: z.literal("text"),
  content: z.string().max(10000).default(""),
});

const boardElementSchema = z.discriminatedUnion("type", [
  statElementSchema,
  tableElementSchema,
  chartElementSchema,
  textElementSchema,
]);

export const boardDefinitionSchema = z.object({
  version: z.literal(BOARD_DEFINITION_VERSION).default(BOARD_DEFINITION_VERSION),
  elements: z.array(boardElementSchema).default([]),
});

export type BoardDefinition = z.infer<typeof boardDefinitionSchema>;
export type BoardElement = z.infer<typeof boardElementSchema>;
export type StatAggregate = z.infer<typeof statAggregateSchema>;
export type StatElement = z.infer<typeof statElementSchema>;
export type TableElement = z.infer<typeof tableElementSchema>;
export type ChartElement = z.infer<typeof chartElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;

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
