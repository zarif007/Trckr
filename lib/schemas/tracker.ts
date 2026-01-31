import { z } from 'zod'

const fieldName = () =>
  z
    .string()
    .describe(
      'CamelCase identifier for code usage (ids should be unique)'
    )

const snakeCaseId = () =>
  z
    .string()
    .describe('Immutable, DB-safe identifier (snake_case preferred)')

export const trackerSchema = z.object({
  tabs: z
    .array(
      z.object({
        id: fieldName(),
        name: z.string().describe('Human-friendly tab title'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
      })
    )
    .describe('Array of independent tab objects'),

  sections: z
    .array(
      z.object({
        id: fieldName(),
        name: z.string().describe('Section display name'),
        tabId: z.string().describe('id of the tab this section belongs to'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
      })
    )
    .describe('Array of independent section objects linked to tabs via tabId'),

  grids: z
    .array(
      z.object({
        id: snakeCaseId(),
        name: z.string().describe('Display name of the grid'),
        type: z
          .enum(['div', 'table', 'kanban', 'timeline', 'calendar'])
          .describe('Layout type for this grid'),
        sectionId: z.string().describe('id of the section this grid belongs to'),
        placeId: z.number().describe('Sorting identifier (smaller numbers appear first)'),
        config: z.record(z.string(), z.any()).optional().describe('Type-specific configuration (e.g. { groupBy: "status" })'),
      })
    )
    .describe('Array of independent grid objects linked to sections via sectionId'),

  fields: z
    .array(
      z.object({
        id: snakeCaseId(),
        dataType: z
          .enum([
            'string',
            'number',
            'date',
            'options',
            'multiselect',
            'boolean',
            'text',
             'link',
             'currency',
             'percentage'
          ])
          .describe('Semantic data type of the field.'),
        ui: z.object({
            label: z.string().describe('Human-readable label for the field'),
            placeholder: z.string().optional(),
        }),
        config: z
          .object({
            required: z.boolean().optional(),
            defaultValue: z.any().optional(),
            optionsMappingId: z.string().optional().describe('For options/multiselect fields: the mapping id to resolve options.'),
             binding: z.object({
                 tableName: z.string(),
                 fieldName: z.string(),
             }).optional().describe('Dynamic binding info for advanced use cases'),
          })
          .optional(),
      })
    )
    .describe('Array of atomic data fields (columns in collection / individual values in div)'),

  layoutNodes: z
    .array(
        z.object({
            gridId: z.string().describe('the container grid id where this node renders'),
            refType: z.enum(['field', 'collection']).describe('What to render: a simple field or a multi-row collection'),
            refId: z.string().describe('id of the field or collection'),
            order: z.number().describe('position in grid'),
            renderAs: z.enum(['default', 'table', 'kanban', 'calendar', 'timeline']).optional().describe('How to render this node (mostly for collections)'),
        })
    )
    .describe('Glue: connects fields/collections -> grids. Defines placement & order in UI'),

  collections: z
    .array(
        z.object({
            id: snakeCaseId(),
            name: z.string().describe('Entity name (e.g. "Sales Order Items")'),
            fields: z.array(
                z.object({
                    id: snakeCaseId(),
                    dataType: z.enum(['string', 'number', 'link', 'currency', 'percentage']),
                    label: z.string(),
                })
            ).describe('Array of atomic fields for each row in this collection'),
        })
    )
    .describe('Multi-row child entities (like sales_order_item)'),

  optionTables: z
    .array(
        z.object({
            id: z.string(),
            options: z.array(
                z.object({
                    label: z.string(),
                    value: z.any(),
                }).passthrough()
            )
        })
    )
    .describe('Dynamic tables for select / multi-select field options'),

  gridData: z
    .record(z.string(), z.array(z.record(z.string(), z.any())))
    .optional()
    .describe('Optional per-grid/collection datasets keyed by gridId or collectionId.'),
})

export type TrackerSchema = z.infer<typeof trackerSchema>
