// lib/field-rules/schema.ts

import { z } from 'zod'

// Use z.any() for ExprNode fields — validated at rule execution time.
const exprNodeSchema = z.any()

const nodeTriggerTypeSchema = z.enum([
  'onMount',
  'onRowCreate',
  'onRowCopy',
  'onFieldChange',
  'onConditionMet',
  'onUserContext',
  'onExternalBinding',
  'onRowFocus',
  'onDependencyResolve',
])

const triggerConfigSchema = z
  .object({
    watchedFieldId: z.string().optional(),
    contextVar: z.enum(['user', 'role', 'team', 'timezone']).optional(),
    sourceSchemaId: z.string().optional(),
    fieldPath: z.string().optional(),
    refreshIntervalMs: z.number().optional(),
    linkedFieldId: z.string().optional(),
    recordPath: z.string().optional(),
    condition: exprNodeSchema.optional(),
  })
  .passthrough()
  .optional()

export const fieldRuleSchema = z
  .object({
    id: z.string(),
    enabled: z.boolean().default(true),
    trigger: nodeTriggerTypeSchema,
    triggerConfig: triggerConfigSchema,
    condition: exprNodeSchema.optional(),
    property: z.enum(['visibility', 'label', 'required', 'disabled', 'options', 'value']),
    outcome: exprNodeSchema,
    engineType: z.enum(['property', 'value']),
    label: z.string().optional(),
  })
  .passthrough()

export const fieldRulesSchema = z
  .record(z.string(), z.array(fieldRuleSchema))
  .optional()
  .describe('AST-based field behavior rules keyed by target field path (gridId.fieldId).')
