// lib/field-rules/schema.ts

import { z } from "zod";

// Use z.any() for ExprNode fields — validated at rule execution time.
const exprNodeSchema = z.any();

const nodeTriggerTypeSchema = z.enum([
  "onMount",
  "onRowCreate",
  "onRowCopy",
  "onRowFocus",
  "onFieldChange",
]);

export const fieldRuleSchema = z
  .object({
    id: z.string(),
    enabled: z.boolean().default(true),
    trigger: nodeTriggerTypeSchema,
    condition: exprNodeSchema.optional(),
    property: z.enum(["visibility", "label", "required", "disabled", "value"]),
    outcome: exprNodeSchema,
    engineType: z.enum(["property", "value"]),
    label: z.string().optional(),
  })
  .passthrough();

export const fieldRulesSchema = z
  .record(z.string(), z.array(fieldRuleSchema))
  .optional()
  .describe(
    "AST-based field behavior rules keyed by target field path (gridId.fieldId).",
  );
