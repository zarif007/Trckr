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
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
      })
    )
    .describe('Array of independent tab objects'),
  sections: z
    .array(
      z.object({
        name: z.string().describe('Section display name'),
        fieldName: fieldName(),
        tabId: z.string().describe('fieldName of the tab this section belongs to'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
      })
    )
    .describe('Array of independent section objects linked to tabs via tabId'),
  grids: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9_]+$/, { message: 'Must be snake_case' })
          .describe('Immutable, DB-safe identifier (snake_case)'),
        key: z
          .string()
          .regex(/^[a-z][A-Za-z0-9]*$/, { message: 'Must be camelCase' })
          .describe('API identifier (camelCase) for code usage'),
        name: z.string().describe('Grid display name'),
        type: z
          .enum(['table', 'kanban', 'div'])
          .describe('Layout type for this grid'),
        isShadow: z
          .boolean()
          .optional()
          .describe('Whether this grid is a shadow representation of another grid'),
        gridId: z
          .string()
          .optional()
          .describe('id (snake_case) of the actual grid this shadow grid tracks when isShadow is true'),
        sectionId: z
          .string()
          .describe('fieldName of the section this grid belongs to'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
        config: z.union([
          z.object({
            layout: z.enum(['vertical', 'horizontal']).optional(),
          }).describe('Configuration for div grids'),
          z.object({
            sortable: z.boolean().optional(),
            pagination: z.boolean().optional(),
            rowSelection: z.boolean().optional(),
          }).describe('Configuration for table grids'),
          z.object({
            groupBy: z.string().describe('Field ID to group by (REQUIRED for Kanban)'),
            orderBy: z.string().optional().describe('Field ID to order by'),
          }).describe('Configuration for kanban grids'),
        ]).optional(),
      })
    )
    .describe('Array of independent grid objects linked to sections via sectionId'),
  fields: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9_]+$/, { message: 'Must be snake_case' })
          .describe('Immutable, DB-safe identifier (snake_case)'),
        key: z
          .string()
          .regex(/^[a-z][A-Za-z0-9]*$/, { message: 'Must be camelCase' })
          .describe('API identifier (camelCase) for code usage'),
        dataType: z
          .enum([
            'string',
            'number',
            'date',
            'options',
            'multiselect',
            'boolean',
            'text',
          ])
          .describe('Semantic data type of the field. Note: "options" and "multiselect" SHOULD use config.optionsMappingId.'),
        gridId: z
          .string()
          .describe('id (snake_case) of the grid this field belongs to'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
        ui: z.object({
          label: z.string().describe('Human-readable label for the field'),
          placeholder: z.string().optional().describe('Placeholder text for inputs'),
          order: z.number().optional().describe('Sort order for display'),
        }),
        config: z
          .object({
            defaultValue: z.any().optional(),
            required: z.boolean().optional(),
            min: z.number().optional(),
            max: z.number().optional(),
            minLength: z.number().optional(),
            maxLength: z.number().optional(),
            optionsMappingId: z
              .string()
              .optional()
              .describe(
                'For options/multiselect fields: the mapping id to resolve options.'
              ),
            options: z
              .array(
                z.object({
                  id: z.string(),
                  label: z.string(),
                })
              )
              .optional()
              .describe(
                'DEPRECATED: Inline options for select/multiselect fields.'
              ),
          })
          .optional(),
      })
    )
    .describe('Array of independent field objects linked to grids via gridId'),
  gridData: z
    .record(z.string(), z.array(z.record(z.string(), z.any())))
    .optional()
    .describe(
      'Optional per-grid datasets keyed by gridId.'
    ),
})

export type TrackerSchema = z.infer<typeof trackerSchema>
