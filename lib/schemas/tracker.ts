import { z } from 'zod'

const fieldName = () =>
  z
    .string()
    .regex(/^[a-z][A-Za-z0-9]*$/, {
      message: 'Must be camelCase, English, no spaces',
    })
    .describe(
      'CamelCase identifier for code usage (must be unique across all tabs, sections, grids, and fields)'
    )

export const trackerSchema = z.object({
  tabs: z
    .array(
      z.object({
        name: z.string().describe('Human-friendly tab title'),
        fieldName: fieldName(),
      })
    )
    .describe('Array of independent tab objects'),
  sections: z
    .array(
      z.object({
        name: z.string().describe('Section display name'),
        fieldName: fieldName(),
        tabId: z.string().describe('fieldName of the tab this section belongs to'),
      })
    )
    .describe('Array of independent section objects linked to tabs via tabId'),
  grids: z
    .array(
      z.object({
        name: z.string().describe('Grid display name'),
        fieldName: fieldName(),
        type: z
          .enum(['table', 'kanban', 'div'])
          .describe('Layout type for this grid'),
        sectionId: z
          .string()
          .describe('fieldName of the section this grid belongs to'),
      })
    )
    .describe('Array of independent grid objects linked to sections via sectionId'),
  fields: z
    .array(
      z.object({
        name: z.string().describe('Field display name'),
        fieldName: fieldName(),
        type: z
          .enum([
            'string',
            'number',
            'date',
            'options',
            'multiselect',
            'boolean',
            'text',
          ])
          .describe('Field data type'),
        gridId: z
          .string()
          .describe('fieldName of the grid this field belongs to'),
        options: z
          .array(z.string())
          .optional()
          .describe('Options when type is "options" or "multiselect"'),
      })
    )
    .describe('Array of independent field objects linked to grids via gridId'),
  shadowGrids: z
    .array(
      z.object({
        name: z.string().describe('Shadow grid display name'),
        fieldName: fieldName(),
        type: z
          .enum(['table', 'kanban'])
          .describe('Layout type for this shadow grid'),
        gridId: z
          .string()
          .describe('fieldName of the actual grid this shadow grid tracks'),
        sectionId: z
          .string()
          .describe('fieldName of the section this shadow grid belongs to'),
      })
    )
    .optional()
    .describe('Array of shadow grid objects linked to actual grids via gridId'),
  views: z
    .array(z.string())
    .describe('Array of view names like "Table", "Calendar", etc.'),
  examples: z
    .array(z.record(z.string(), z.any()))
    .describe(
      'Array of 2-3 sample data objects; keys must match every fieldName defined in fields.'
    ),
})

export type TrackerSchema = z.infer<typeof trackerSchema>
