import { z } from "zod";
import { dynamicOptionsDefinitionsSchema } from "@/lib/dynamic-options/user-functions/schema";
import { TRACKER_FIELD_TYPES } from "@/lib/tracker-field-types";
import { fieldRulesSchema as fieldRulesV2ZodSchema } from "@/lib/field-rules";

const tabId = () =>
  z
    .string()
    .describe(
      "Unique tab id ending with _tab (e.g. overview_tab, master_data_tab)",
    );

const sectionId = () =>
  z
    .string()
    .describe(
      "Unique section id ending with _section (e.g. main_section, option_lists_section)",
    );

const gridId = () =>
  z
    .string()
    .describe("Unique grid id ending with _grid (e.g. tasks_grid, meta_grid)");

const snakeCaseId = () =>
  z.string().describe("Immutable, DB-safe identifier (snake_case preferred)");

/** Field ids reserved for system use. LLMs and users cannot create fields with these ids. */
export const RESERVED_FIELD_IDS = ["row_id"] as const;

const fieldId = () =>
  snakeCaseId().refine(
    (id) => !(RESERVED_FIELD_IDS as readonly string[]).includes(id),
    { message: "row_id is reserved for system use" },
  );

// --- Config standards (required for LLM output; components enforce these) ---

/** Config is lenient so LLM output always passes; UI handles missing/wrong keys. */
const anyConfig = () => z.record(z.string(), z.any()).nullish();

/** Field config: lenient so LLM output passes; UI handles missing/wrong keys. */
export const fieldConfigSchema = z
  .record(z.string(), z.any())
  .optional()
  .nullable();

/** Tab config */
export const tabConfigSchema = anyConfig();

/** Section config */
export const sectionConfigSchema = anyConfig();

/** Grid config */
export const gridConfigSchema = anyConfig();

const viewTypeEnum = z
  .enum(["div", "table", "kanban", "timeline", "calendar"])
  .catch("table")
  .describe(
    "div = single-instance only (meta, bio, summary). table/kanban/timeline/calendar = repetitive rows/items.",
  );

/** View id for grid views (e.g. tasks_kanban_view). Optional _view suffix to avoid clashing with grid ids. */
const viewId = () =>
  z
    .string()
    .describe(
      "Unique view id (e.g. tasks_kanban_view). Same data as parent grid; different type/config.",
    );

/** View: alternative representation of the same grid data (e.g. Kanban for a table grid). */
export const gridViewSchema = z
  .object({
    id: viewId(),
    name: z.string().describe('Tab label (e.g. "Kanban")'),
    type: viewTypeEnum.describe(
      "View type; use type-specific config (e.g. groupBy for kanban).",
    ),
    config: gridConfigSchema,
  })
  .passthrough();

const fieldDataTypeEnum = z.enum(TRACKER_FIELD_TYPES).catch("string");

const masterDataScopeSchema = z
  .enum(["tracker", "module", "project"])
  .optional()
  .describe(
    "Master data scope: tracker (local), module (shared in module), project (shared across project).",
  );

const renderAsEnum = z
  .enum(["default", "table", "kanban", "calendar", "timeline"])
  .optional();

// FIELD RULES (conditional field actions)

// BINDINGS - select/multiselect auto-population

/** Single field mapping: from source field in options grid to target field in main grid. Paths are grid_id.field_id */
const fieldMappingSchema = z
  .object({
    from: z.string().describe("Path in options grid: grid_id.field_id"),
    to: z.string().describe("Path in main grid: grid_id.field_id"),
  })
  .passthrough();

/** Binding entry for a select/multiselect field. Option display and stored value come from the same field (labelField). Paths use grid.field, no tab. */
const bindingEntrySchema = z
  .object({
    optionsSourceSchemaId: z
      .string()
      .optional()
      .describe(
        "Optional id of another tracker schema in the same project; when set, optionsGrid/labelField refer to that schema and rows load from that tracker data.",
      ),
    optionsSourceKey: z
      .string()
      .optional()
      .describe(
        "Optional stable key for master data tracker specs (module/project scope). Used to match bindings to master data tracker definitions.",
      ),
    optionsGrid: z
      .string()
      .describe("Grid id containing options (e.g. product_options_grid)"),
    labelField: z
      .string()
      .describe(
        "Path to the option field in options grid (grid_id.field_id). Must be a different field id than the select field—use a dedicated option field in the options grid (e.g. exercise_options_grid.exercise_option), not the same id as the bound select.",
      ),
    fieldMappings: z
      .array(fieldMappingSchema)
      .default([])
      .describe(
        'Must include one mapping where "to" is this select field and "from" is the same path as labelField; other mappings auto-populate',
      ),
  })
  .passthrough();

/** Top-level bindings object. Key is full field path: grid_id.field_id */
export const bindingsSchema = z
  .record(z.string(), bindingEntrySchema)
  .default({})
  .describe(
    "Bindings for select/multiselect fields. Key is grid_id.field_id. MANDATORY for all select/multiselect fields.",
  );

/** Single validation rule (mirrors runtime FieldValidationRule; expr may use _intent until resolved). */
export const fieldValidationRuleSchema = z.union([
  z
    .object({ type: z.literal("required"), message: z.string().optional() })
    .passthrough(),
  z
    .object({
      type: z.literal("min"),
      value: z.coerce.number(),
      message: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("max"),
      value: z.coerce.number(),
      message: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("minLength"),
      value: z.coerce.number(),
      message: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("maxLength"),
      value: z.coerce.number(),
      message: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("expr"),
      expr: z.any(),
      message: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("expr"),
      _intent: z.string(),
      message: z.string().optional(),
    })
    .passthrough(),
  /** Lenient fallback for forward-compatible or malformed rules from the LLM */
  z.object({ type: z.string() }).passthrough(),
]);

/** Top-level validations map (grid_id.field_id -> rules). */
export const validationsSchema = z
  .record(z.string(), z.array(fieldValidationRuleSchema))
  .default({})
  .describe(
    'Field validations keyed by grid_id.field_id (like bindings). For type "expr", use either { expr } or { _intent } until the expression agent resolves _intent.',
  );

/** Top-level calculations map (target fieldId -> expression rule or intent). */
export const calculationsSchema = z
  .record(
    z.string(),
    z.union([
      z.object({ expr: z.any() }).passthrough(),
      z.object({ _intent: z.string() }).passthrough(),
    ]),
  )
  .default({})
  .describe(
    "Field calculations keyed by target field id (grid_id.field_id). Value is either { expr: ExprNode } or { _intent: string }.",
  );

export const trackerSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe(
        'Display name of the tracker (e.g. "Fitness Log", "Project Tasks").',
      ),
    masterDataScope: masterDataScopeSchema,
    tabs: z
      .array(
        z
          .object({
            id: tabId(),
            name: z.string(),
            placeId: z.coerce.number(),
            config: tabConfigSchema,
          })
          .passthrough(),
      )
      .default([])
      .describe("Array of tab objects. Tabs are top-level pages."),

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
          .passthrough(),
      )
      .default([])
      .describe("Array of section objects. Sections group grids within a tab."),

    grids: z
      .array(
        z
          .object({
            id: gridId(),
            name: z.string(),
            sectionId: z.string(),
            placeId: z.coerce.number(),
            config: gridConfigSchema,
            views: z
              .array(gridViewSchema)
              .default([])
              .describe(
                "Views for this grid. Each view has its own type and config (e.g. groupBy for kanban).",
              ),
          })
          .passthrough(),
      )
      .default([])
      .describe(
        "Array of grid objects. Grid type is defined by views; use div view only for one-per-view content; use table/kanban/timeline/calendar views for repeating data.",
      ),

    fields: z
      .array(
        z
          .object({
            id: fieldId(),
            dataType: fieldDataTypeEnum,
            ui: z
              .object({
                label: z.string(),
                placeholder: z.string().optional(),
              })
              .passthrough(),
            config: fieldConfigSchema,
          })
          .passthrough(),
      )
      .default([])
      .describe(
        "Array of atomic field definitions. Referenced by layoutNodes to place into grids.",
      ),

    validations: validationsSchema,

    calculations: calculationsSchema,

    layoutNodes: z
      .array(
        z
          .object({
            gridId: z.string(),
            fieldId: z.string(),
            order: z.coerce.number(),
            row: z
              .number()
              .optional()
              .describe("Row index for div (form) grid layout."),
            col: z
              .number()
              .optional()
              .describe(
                "Column index for div (form) grid layout; max 3 per row.",
              ),
            renderAs: renderAsEnum,
          })
          .passthrough(),
      )
      .default([])
      .describe(
        "Places fields into grids. Each node links one field to one grid with an order.",
      ),

    fieldRulesV2: fieldRulesV2ZodSchema,

    bindings: bindingsSchema,

    formActions: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().trim().min(1),
            statusTag: z.string().trim().min(1),
            isEditable: z.boolean(),
            persistOnly: z.boolean().optional(),
            isLast: z.boolean().optional(),
          })
          .passthrough(),
      )
      .min(1)
      .default([
        {
          id: "default_save_action",
          label: "Save",
          statusTag: "Saved",
          isEditable: true,
        },
      ])
      .describe("Optional form action buttons for data mode status control."),
    dynamicOptions: dynamicOptionsDefinitionsSchema.optional(),
  })
  .passthrough();

export type TrackerSchema = z.infer<typeof trackerSchema>;
