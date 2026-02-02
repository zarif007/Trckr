import { z } from 'zod'

const fieldName = () =>
  z
    .string()
    .describe(
      'CamelCase identifier for code usage (ids should be unique)'
    )

const tabId = () =>
  z
    .string()
    .describe('Unique tab id ending with _tab (e.g. overview_tab, shared_tab)')

const sectionId = () =>
  z
    .string()
    .describe('Unique section id ending with _section (e.g. main_section, option_lists_section)')

const gridId = () =>
  z
    .string()
    .describe('Unique grid id ending with _grid (e.g. tasks_grid, meta_grid)')

const snakeCaseId = () =>
  z
    .string()
    .describe('Immutable, DB-safe identifier (snake_case preferred)')

// --- Config standards (required for LLM output; components enforce these) ---

/** Config is lenient so LLM output always passes; UI handles missing/wrong keys. */
const anyConfig = () => z.record(z.string(), z.any()).nullish()

/** Field config: lenient so LLM output passes; UI handles missing/wrong keys. */
export const fieldConfigSchema = z
  .record(z.string(), z.any())
  .optional()
  .nullable()

/** Tab config */
export const tabConfigSchema = anyConfig()

/** Section config */
export const sectionConfigSchema = anyConfig()

/** Grid config */
export const gridConfigSchema = anyConfig()

const gridTypeEnum = z
  .enum(['div', 'table', 'kanban', 'timeline', 'calendar'])
  .catch('table')
  .describe(
    'div = single-instance only (meta, bio, summary). table/kanban/timeline/calendar = repetitive rows/items.'
  )

const fieldDataTypeEnum = z
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
    'percentage',
  ])
  .catch('string')

const renderAsEnum = z
  .enum(['default', 'table', 'kanban', 'calendar', 'timeline'])
  .optional()

export const trackerSchema = z
  .object({
    tabs: z
      .array(
        z
          .object({
            id: tabId(),
            name: z.string(),
            placeId: z.coerce.number(),
            config: tabConfigSchema,
          })
          .passthrough()
      )
      .default([])
      .describe('Array of tab objects. Tabs are top-level pages.'),

    sections: z
      .array(
        z
          .object({
            id: sectionId(),
            name: z.string(),
            tabId: z.string(),
            placeId: z.coerce.number(),
            config: sectionConfigSchema,
          })
          .passthrough()
      )
      .default([])
      .describe('Array of section objects. Sections group grids within a tab.'),

    grids: z
      .array(
        z
          .object({
            id: gridId(),
            name: z.string(),
            type: gridTypeEnum,
            sectionId: z.string(),
            placeId: z.coerce.number(),
            config: gridConfigSchema,
          })
          .passthrough()
      )
      .default([])
      .describe(
        'Array of grid objects. Use div only for one-per-view content; use table (or kanban/timeline/calendar) for repeating data.'
      ),

    fields: z
      .array(
        z
          .object({
            id: snakeCaseId(),
            dataType: fieldDataTypeEnum,
            ui: z
              .object({
                label: z.string(),
                placeholder: z.string().optional(),
              })
              .passthrough(),
            config: fieldConfigSchema,
          })
          .passthrough()
      )
      .default([])
      .describe('Array of atomic field definitions. Referenced by layoutNodes to place into grids.'),

    layoutNodes: z
      .array(
        z
          .object({
            gridId: z.string(),
            fieldId: z.string(),
            order: z.coerce.number(),
            renderAs: renderAsEnum,
          })
          .passthrough()
      )
      .default([])
      .describe('Places fields into grids. Each node links one field to one grid with an order.'),

    optionTables: z
      .array(
        z
          .object({
            id: z.string().describe('Unique id referenced by field config.optionTableId'),
            options: z.array(z.object({ label: z.string().optional(), value: z.any().optional() }).passthrough()).describe('Inline list of { label, value } for select/multiselect'),
          })
          .passthrough()
      )
      .default([])
      .describe('Option tables: one per distinct option set. Every options/multiselect field must get options from here (optionTableId) or from optionMaps + Shared tab (optionMapId).'),

    optionMaps: z
      .array(
        z
          .object({
            id: z.string().describe('Unique id referenced by field config.optionMapId'),
            tabId: z.string().describe('Tab that contains the options table (e.g. shared_tab)'),
            gridId: z.string().describe('Grid (table) that holds option rows'),
            labelFieldId: z.string().optional().describe('Field id in that grid for the option label (display text)'),
            valueFieldId: z.string().optional().describe('Field id in that grid for the option value (stored in main field)'),
          })
          .passthrough()
      )
      .default([])
      .describe('Option maps: one per option source when using Shared tab. Every options/multiselect field must have optionMapId (here) or optionTableId (optionTables).'),
  })
  .passthrough()

export type TrackerSchema = z.infer<typeof trackerSchema>
