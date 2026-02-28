import { z } from 'zod'
import { dynamicOptionsDefinitionsSchema } from '@/lib/dynamic-options/user-functions/schema'

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

const viewTypeEnum = z
  .enum(['div', 'table', 'kanban', 'timeline', 'calendar'])
  .catch('table')
  .describe(
    'div = single-instance only (meta, bio, summary). table/kanban/timeline/calendar = repetitive rows/items.'
  )

/** View id for grid views (e.g. tasks_kanban_view). Optional _view suffix to avoid clashing with grid ids. */
const viewId = () =>
  z
    .string()
    .describe('Unique view id (e.g. tasks_kanban_view). Same data as parent grid; different type/config.')

/** View: alternative representation of the same grid data (e.g. Kanban for a table grid). */
export const gridViewSchema = z
  .object({
    id: viewId(),
    name: z.string().describe('Tab label (e.g. "Kanban")'),
    type: viewTypeEnum.describe('View type; use type-specific config (e.g. groupBy for kanban).'),
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
    'dynamic_select',
    'dynamic_multiselect',
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

/** Style override tokens (optional). Resolved to Tailwind in style-utils. */
export const styleOverridesSchema = z
  .object({
    fontSize: z
      .enum(['xs', 'sm', 'base', 'lg', 'xl'])
      .optional()
      .describe('Font size token'),
    fontWeight: z
      .enum(['normal', 'medium', 'semibold', 'bold'])
      .optional()
      .describe('Font weight token'),
    textColor: z
      .enum(['default', 'muted', 'primary', 'blue', 'green', 'red', 'purple', 'amber', 'rose'])
      .optional()
      .describe('Text (font) color for cells and inputs'),
    density: z
      .enum(['compact', 'default', 'comfortable'])
      .optional()
      .describe('Controls cell padding and row height'),
    accentColor: z
      .enum(['default', 'blue', 'green', 'red', 'purple', 'amber', 'rose'])
      .optional()
      .describe('Accent / highlight colour'),
    headerStyle: z
      .enum(['default', 'muted', 'accent', 'bold'])
      .optional()
      .describe('Header appearance'),
    stripedRows: z.boolean().optional().describe('Alternate row shading (table)'),
    borderStyle: z
      .enum(['none', 'default', 'strong'])
      .optional()
      .describe('Border weight'),
    cardSize: z
      .enum(['sm', 'md', 'lg'])
      .optional()
      .describe('Kanban card size'),
    columnWidth: z.number().optional().describe('Kanban column width in px'),
  })
  .passthrough()

export const stylesSchema = z
  .record(z.string(), styleOverridesSchema)
  .optional()
  .default({})
  .describe('Style overrides keyed by grid or view id. Only when user asks for visual changes.')

// DEPENDS-ON (conditional field actions)

const dependsOnActionEnum = z
  .enum(['isHidden', 'isRequired', 'isDisabled'])
  .catch('isHidden')

export const dependsOnRuleSchema = z
  .object({
    source: z.string().describe('Source field path (grid_id.field_id)'),
    operator: z.string().optional().describe('Comparison operator (e.g. =, !=, >, contains, in, is_empty)'),
    value: z.any().optional().describe('Value to compare against'),
    action: dependsOnActionEnum.describe('Target field property to set (hide/require/disable)'),
    set: z.union([z.boolean(), z.any()]).optional().describe('For isHidden/isRequired/isDisabled: value to set (default true).'),
    targets: z.array(z.string()).default([]).describe('Target field paths (grid_id.field_id)'),
    priority: z.coerce.number().optional().describe('Priority for conflict resolution; higher wins'),
  })
  .passthrough()

export const dependsOnSchema = z
  .array(dependsOnRuleSchema)
  .default([])
  .describe('Conditional field actions: evaluate source field, apply action to targets.')

// BINDINGS - select/multiselect auto-population

/** Single field mapping: from source field in options grid to target field in main grid. Paths are grid_id.field_id */
const fieldMappingSchema = z
  .object({
    from: z.string().describe('Path in options grid: grid_id.field_id'),
    to: z.string().describe('Path in main grid: grid_id.field_id'),
  })
  .passthrough()

/** Binding entry for a select/multiselect field. Option display and stored value come from the same field (labelField). Paths use grid.field, no tab. */
const bindingEntrySchema = z
  .object({
    optionsGrid: z.string().describe('Grid id containing options (e.g. product_options_grid)'),
    labelField: z.string().describe('Path to the option field in options grid (grid_id.field_id). This field provides both display and stored value, e.g. exercise_options_grid.exercise'),
    fieldMappings: z.array(fieldMappingSchema).default([]).describe('Must include one mapping where "to" is this select field and "from" is the same path as labelField; other mappings auto-populate'),
  })
  .passthrough()

/** Top-level bindings object. Key is full field path: grid_id.field_id */
export const bindingsSchema = z
  .record(z.string(), bindingEntrySchema)
  .default({})
  .describe('Bindings for select/multiselect fields. Key is grid_id.field_id. MANDATORY for all select/multiselect fields.')

/** Top-level validations map (fieldId -> rules). */
export const validationsSchema = z
  .record(z.string(), z.array(z.any()))
  .default({})
  .describe('Field validations keyed by field id. Rules are evaluated in order.')

/** Top-level calculations map (target fieldId -> expression rule). */
export const calculationsSchema = z
  .record(z.string(), z.object({ expr: z.any() }).passthrough())
  .default({})
  .describe('Field calculations keyed by target field id (grid_id.field_id).')

export const trackerSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe('Display name of the tracker (e.g. "Fitness Log", "Project Tasks").'),
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
            sectionId: z.string(),
            placeId: z.coerce.number(),
            config: gridConfigSchema,
            views: z.array(gridViewSchema).default([]).describe('Views for this grid. Each view has its own type and config (e.g. groupBy for kanban).'),
          })
          .passthrough()
      )
      .default([])
      .describe(
        'Array of grid objects. Grid type is defined by views; use div view only for one-per-view content; use table/kanban/timeline/calendar views for repeating data.'
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

    validations: validationsSchema,

    calculations: calculationsSchema,

    layoutNodes: z
      .array(
        z
          .object({
            gridId: z.string(),
            fieldId: z.string(),
            order: z.coerce.number(),
            row: z.number().optional().describe('Row index for div (form) grid layout.'),
            col: z.number().optional().describe('Column index for div (form) grid layout; max 3 per row.'),
            renderAs: renderAsEnum,
          })
          .passthrough()
      )
      .default([])
      .describe('Places fields into grids. Each node links one field to one grid with an order.'),

    dependsOn: dependsOnSchema,

    bindings: bindingsSchema,

    styles: stylesSchema,
    dynamicOptions: dynamicOptionsDefinitionsSchema.optional(),
  })
  .passthrough()

export type TrackerSchema = z.infer<typeof trackerSchema>
export type StyleOverrides = z.infer<typeof styleOverridesSchema>
