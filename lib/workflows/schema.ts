/**
 * Zod validation schemas for workflow definitions.
 * Validates workflow structure, node configs, and graph constraints.
 */

import { z } from "zod";
import { exprSchema } from "@/lib/schemas/expr";

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const triggerEventSchema = z.enum([
  "row_create",
  "row_update",
  "row_delete",
  "field_change",
]);

const mapFieldSourceSchema = z.object({
  type: z.enum(["field", "expression"]),
  path: z.string().optional(),
  expr: exprSchema.optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  branchType: z.enum(["true", "false"]).optional(),
});

const viewportSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    zoom: z.number(),
  })
  .optional();

// ─── V1 nodes (strict gridId) ───

const triggerNodeSchemaV1 = z.object({
  id: z.string(),
  type: z.literal("trigger"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    trackerSchemaId: z.string(),
    gridId: z.string(),
    event: triggerEventSchema,
    watchFields: z.array(z.string()).optional(),
  }),
});

const conditionNodeSchema = z.object({
  id: z.string(),
  type: z.literal("condition"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    condition: exprSchema,
  }),
});

const fieldMappingEntrySchemaV1 = z.object({
  id: z.string(),
  source: mapFieldSourceSchema,
  target: z.object({
    trackerSchemaId: z.string(),
    gridId: z.string(),
    fieldId: z.string(),
  }),
});

const mapFieldsNodeSchema = z.object({
  id: z.string(),
  type: z.literal("map_fields"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    mappings: z.array(fieldMappingEntrySchemaV1),
  }),
});

const actionNodeSchemaV1 = z.object({
  id: z.string(),
  type: z.literal("action"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    actionType: z.enum(["create_row", "update_row", "delete_row"]),
    trackerSchemaId: z.string(),
    gridId: z.string(),
    whereClause: exprSchema.optional(),
    mapFieldsNodeId: z.string().optional(),
  }),
});

const workflowNodeSchemaV1 = z.discriminatedUnion("type", [
  triggerNodeSchemaV1,
  conditionNodeSchema,
  mapFieldsNodeSchema,
  actionNodeSchemaV1,
]);

export const workflowSchemaV1Zod = z.object({
  version: z.literal(1),
  nodes: z.array(workflowNodeSchemaV1),
  edges: z.array(edgeSchema),
  viewport: viewportSchema,
});

// ─── V2 nodes (tracker-centric; optional gridId; redirect) ───

const fieldMappingEntrySchemaV2 = z.object({
  id: z.string(),
  source: mapFieldSourceSchema,
  target: z.object({
    trackerSchemaId: z.string(),
    fieldId: z.string(),
    gridId: z.string().optional(),
  }),
});

const mapFieldsNodeSchemaV2 = z.object({
  id: z.string(),
  type: z.literal("map_fields"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    mappings: z.array(fieldMappingEntrySchemaV2),
  }),
});

const triggerNodeSchemaV2 = z.object({
  id: z.string(),
  type: z.literal("trigger"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    trackerSchemaId: z.string(),
    gridId: z.string().optional(),
    event: triggerEventSchema,
    watchFields: z.array(z.string()).optional(),
  }),
});

const actionNodeSchemaV2 = z.object({
  id: z.string(),
  type: z.literal("action"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    actionType: z.enum(["create_row", "update_row", "delete_row"]),
    trackerSchemaId: z.string(),
    gridId: z.string().optional(),
    whereClause: exprSchema.optional(),
    mapFieldsNodeId: z.string().optional(),
  }),
});

const redirectNodeSchemaV2 = z.object({
  id: z.string(),
  type: z.literal("redirect"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    kind: z.literal("url"),
    value: z.string().min(1),
  }),
});

const workflowNodeSchemaV2 = z.discriminatedUnion("type", [
  triggerNodeSchemaV2,
  conditionNodeSchema,
  mapFieldsNodeSchemaV2,
  actionNodeSchemaV2,
  redirectNodeSchemaV2,
]);

export const workflowSchemaV2Zod = z.object({
  version: z.literal(2),
  nodes: z.array(workflowNodeSchemaV2),
  edges: z.array(edgeSchema),
  viewport: viewportSchema,
});

/** Accepts persisted V1 or V2 workflow JSON. */
export const workflowSchemaZod = z.discriminatedUnion("version", [
  workflowSchemaV1Zod,
  workflowSchemaV2Zod,
]);

export type WorkflowSchemaZod = z.infer<typeof workflowSchemaZod>;

/** Use when creating or updating a workflow to V2 only. */
export const workflowSchemaV2OnlyZod = workflowSchemaV2Zod;
