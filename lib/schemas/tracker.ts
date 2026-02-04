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

/** View id for shadow views (e.g. tasks_kanban_view). Optional _view suffix to avoid clashing with grid ids. */
const viewId = () =>
  z
    .string()
    .describe('Unique view id (e.g. tasks_kanban_view). Same data as parent grid; different type/config.')

/** Shadow view: alternative representation of the same grid data (e.g. Kanban for a table grid). */
export const gridViewSchema = z
  .object({
    id: viewId(),
    name: z.string().describe('Tab label (e.g. "Kanban")'),
    type: gridTypeEnum.describe('View type; use type-specific config (e.g. groupBy for kanban).'),
    config: gridConfigSchema,
  })
  .passthrough()

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

// ============================================================================
// BINDINGS SCHEMA - For select/multiselect field auto-population
// ============================================================================

/** Single field mapping: from source field in options grid to target field in main grid. Paths are grid_id.field_id */
const fieldMappingSchema = z
  .object({
    from: z.string().describe('Path in options grid: grid_id.field_id'),
    to: z.string().describe('Path in main grid: grid_id.field_id'),
  })
  .passthrough()

/** Binding entry for a select/multiselect field. Value comes from fieldMappings (one mapping where "to" is this field). Paths use grid.field, no tab. */
const bindingEntrySchema = z
  .object({
    optionsGrid: z.string().describe('Grid id containing options (e.g. product_options_grid)'),
    labelField: z.string().describe('Path to label field: grid_id.field_id'),
    fieldMappings: z.array(fieldMappingSchema).default([]).describe('Must include one mapping where "to" is this select field (the "from" is the stored value); other mappings auto-populate'),
  })
  .passthrough()

/** Top-level bindings object. Key is full field path: tab_id.grid_id.field_id */
export const bindingsSchema = z
  .record(z.string(), bindingEntrySchema)
  .default({})
  .describe('Bindings for select/multiselect fields. Key is full field path. MANDATORY for all select/multiselect fields.')

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
            views: z.array(gridViewSchema).default([]).optional().describe('Optional shadow views: same data, different representation (e.g. Table + Kanban tabs). Each view has its own type and config (e.g. groupBy for kanban).'),
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

    bindings: bindingsSchema,
  })
  .passthrough()

export type TrackerSchema = z.infer<typeof trackerSchema>
