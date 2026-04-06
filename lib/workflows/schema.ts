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

const triggerNodeSchema = z.object({
  id: z.string(),
  type: z.literal("trigger"),
  position: positionSchema,
  label: z.string().optional(),
  config: z.object({
    trackerSchemaId: z.string(),
    gridId: z.string(),
    event: z.enum([
      "row_create",
      "row_update",
      "row_delete",
      "field_change",
    ]),
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

const mapFieldSourceSchema = z.object({
  type: z.enum(["field", "expression"]),
  path: z.string().optional(),
  expr: exprSchema.optional(),
});

const fieldMappingEntrySchema = z.object({
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
    mappings: z.array(fieldMappingEntrySchema),
  }),
});

const actionNodeSchema = z.object({
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

const workflowNodeSchema = z.discriminatedUnion("type", [
  triggerNodeSchema,
  conditionNodeSchema,
  mapFieldsNodeSchema,
  actionNodeSchema,
]);

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  branchType: z.enum(["true", "false"]).optional(),
});

export const workflowSchemaZod = z.object({
  version: z.literal(1),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(edgeSchema),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export type WorkflowSchemaZod = z.infer<typeof workflowSchemaZod>;
