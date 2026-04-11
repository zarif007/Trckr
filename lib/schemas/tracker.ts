import { z } from "zod";
import { dynamicOptionsDefinitionsSchema } from "@/lib/dynamic-options/user-functions/schema";
import { TRACKER_FIELD_TYPES } from "@/lib/tracker-field-types";
import { fieldRulesSchema as fieldRulesV2ZodSchema } from "@/lib/field-rules";

// ---------------------------------------------------------------------------
// Shared ID helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// JSONB column Zod schemas (used for app-level validation of jsonb columns)
// ---------------------------------------------------------------------------

/** Lenient config so LLM output always passes; UI handles missing/wrong keys. */
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

const viewId = () =>
  z
    .string()
    .describe(
      "Unique view id (e.g. tasks_kanban_view). Same data as parent grid; different type/config.",
    );

export const gridViewSchema = z
  .object({
    id: viewId(),
    name: z.string().describe('Tab label (e.g. "Kanban")'),
    type: viewTypeEnum.describe(
      "View type; use type-specific config (e.g. groupBy for kanban).",
    ),
    config: gridConfigSchema.describe(
      "Per-view options: table (pageSize, defaultSort); kanban (groupBy); calendar (dateField, titleField, viewType); timeline (dateField, endDateField, titleField, swimlaneField, viewType); div (layout). Key field ids must exist on the grid layoutNodes.",
    ),
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

// ---------------------------------------------------------------------------
// Node config/views JSONB schemas (TrackerNode.config, TrackerNode.views)
// ---------------------------------------------------------------------------

export const nodeConfigSchema = anyConfig();

export const nodeViewsSchema = z
  .array(gridViewSchema)
  .default([])
  .describe(
    "Views for a GRID node. Each view has its own type and config (e.g. groupBy for kanban).",
  );

// ---------------------------------------------------------------------------
// Field UI / config JSONB schemas (TrackerField.ui, TrackerField.config)
// ---------------------------------------------------------------------------

export const fieldUiSchema = z
  .object({
    label: z.string(),
    placeholder: z.string().optional(),
  })
  .passthrough();

// fieldConfigSchema is already exported above

// ---------------------------------------------------------------------------
// Binding config JSONB schema (TrackerBinding.config)
// ---------------------------------------------------------------------------

const fieldMappingSchema = z
  .object({
    from: z.string().describe("Path in options grid: grid_id.field_id"),
    to: z.string().describe("Path in main grid: grid_id.field_id"),
  })
  .passthrough();

export const bindingConfigSchema = z
  .object({
    optionsSourceSchemaId: z.string().optional(),
    optionsSourceKey: z.string().optional(),
    optionsGrid: z.string(),
    labelField: z.string(),
    fieldMappings: z.array(fieldMappingSchema).default([]),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Validation rules JSONB schema (TrackerValidation.rules)
// ---------------------------------------------------------------------------

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
  z.object({ type: z.string() }).passthrough(),
]);

export const validationRulesSchema = z
  .array(fieldValidationRuleSchema)
  .default([]);

// ---------------------------------------------------------------------------
// Calculation expression JSONB schema (TrackerCalculation.expression)
// ---------------------------------------------------------------------------

export const calculationExpressionSchema = z
  .union([
    z.object({ expr: z.any() }).passthrough(),
    z.object({ _intent: z.string() }).passthrough(),
  ]);

// ---------------------------------------------------------------------------
// Dynamic option definition JSONB (TrackerDynamicOption.definition)
// ---------------------------------------------------------------------------

export { dynamicOptionsDefinitionsSchema };

export const dynamicOptionDefinitionSchema = z.any();

// ---------------------------------------------------------------------------
// Field rule config JSONB (TrackerFieldRule.config)
// ---------------------------------------------------------------------------

export const fieldRuleConfigSchema = z
  .array(
    z
      .object({
        id: z.string(),
        enabled: z.boolean().default(true),
        trigger: z.enum([
          "onMount",
          "onRowCreate",
          "onRowCopy",
          "onRowFocus",
          "onFieldChange",
        ]),
        condition: z.any().optional(),
        property: z.enum([
          "visibility",
          "label",
          "required",
          "disabled",
          "value",
        ]),
        outcome: z.any(),
        engineType: z.enum(["property", "value"]),
        label: z.string().optional(),
      })
      .passthrough(),
  )
  .default([]);

// ---------------------------------------------------------------------------
// Form action schema (stored in TrackerSchema.meta)
// ---------------------------------------------------------------------------

export const formActionSchema = z
  .object({
    id: z.string(),
    label: z.string().trim().min(1),
    statusTag: z.string().trim().min(1),
    isEditable: z.boolean(),
    persistOnly: z.boolean().optional(),
    isLast: z.boolean().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Tracker meta JSONB schema (TrackerSchema.meta)
// ---------------------------------------------------------------------------

export const trackerMetaSchema = z
  .object({
    masterDataScope: masterDataScopeSchema,
    masterDataMeta: z.any().optional(),
    formActions: z
      .array(formActionSchema)
      .min(1)
      .default([
        {
          id: "default_save_action",
          label: "Save",
          statusTag: "Saved",
          isEditable: true,
        },
      ]),
    dynamicConnectors: z
      .record(z.string(), z.any())
      .optional(),
  })
  .passthrough();

export type TrackerMeta = z.infer<typeof trackerMetaSchema>;

// ---------------------------------------------------------------------------
// GridRow.data JSONB type
// ---------------------------------------------------------------------------

export type GridRowData = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Flat tracker schema (for AI agent output, backward compat)
//
// The AI builder still outputs this flat shape. The server decomposes it
// into normalized table rows on persist.
// ---------------------------------------------------------------------------

const bindingEntrySchema = z
  .object({
    optionsSourceSchemaId: z.string().optional(),
    optionsSourceKey: z.string().optional(),
    optionsGrid: z.string(),
    labelField: z.string(),
    fieldMappings: z.array(fieldMappingSchema).default([]),
  })
  .passthrough();

export const bindingsSchema = z
  .record(z.string(), bindingEntrySchema)
  .default({})
  .describe(
    "Bindings for select/multiselect fields. Key is grid_id.field_id. MANDATORY for all select/multiselect fields.",
  );

export const validationsSchema = z
  .record(z.string(), z.array(fieldValidationRuleSchema))
  .default({})
  .describe(
    'Field validations keyed by grid_id.field_id (like bindings). For type "expr", use either { expr } or { _intent } until the expression agent resolves _intent.',
  );

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
      .array(formActionSchema)
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

// ---------------------------------------------------------------------------
// Normalized DB types (mirror Prisma models for typed use in app code)
// ---------------------------------------------------------------------------

export type NodeType = "TAB" | "SECTION" | "GRID";

export interface TrackerNodeRow {
  id: string;
  trackerId: string;
  type: NodeType;
  slug: string;
  name: string;
  placeId: number;
  parentId: string | null;
  config: Record<string, unknown> | null;
  views: Array<z.infer<typeof gridViewSchema>> | null;
}

export interface TrackerFieldRow {
  id: string;
  trackerId: string;
  slug: string;
  dataType: string;
  ui: { label: string; placeholder?: string; [key: string]: unknown };
  config: Record<string, unknown> | null;
}

export interface TrackerLayoutNodeRow {
  id: string;
  trackerId: string;
  gridId: string;
  fieldId: string;
  order: number;
  row: number | null;
  col: number | null;
  renderAs: string | null;
}

export interface TrackerBindingRow {
  id: string;
  trackerId: string;
  sourceGridId: string | null;
  sourceFieldId: string | null;
  targetGridId: string;
  targetFieldId: string;
  config: {
    optionsSourceSchemaId?: string;
    optionsSourceKey?: string;
    optionsGrid: string;
    labelField: string;
    fieldMappings: Array<{ from: string; to: string }>;
    [key: string]: unknown;
  };
}

export interface TrackerValidationRow {
  id: string;
  trackerId: string;
  gridId: string;
  fieldId: string;
  rules: unknown[];
}

export interface TrackerCalculationRow {
  id: string;
  trackerId: string;
  gridId: string;
  fieldId: string;
  expression: { expr?: unknown; _intent?: string; [key: string]: unknown };
}

export interface TrackerDynamicOptionRow {
  id: string;
  trackerId: string;
  gridId: string;
  fieldId: string;
  definition: unknown;
}

export interface TrackerFieldRuleRow {
  id: string;
  trackerId: string;
  gridId: string;
  fieldId: string;
  config: unknown[];
}

export interface GridRowRecord {
  id: string;
  trackerId: string;
  gridId: string;
  data: GridRowData;
  schemaVersion: string;
  version: number;
  statusTag: string | null;
  sortOrder: number;
  branchName: string;
  isMerged: boolean;
  deletedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GridRowReferenceRecord {
  fromRowId: string;
  fromFieldId: string;
  toRowId: string;
}

// ---------------------------------------------------------------------------
// Full assembled tracker (returned by API, consumed by components)
// ---------------------------------------------------------------------------

export interface FullTrackerSchema {
  id: string;
  projectId: string;
  moduleId: string | null;
  name: string | null;
  type: string;
  systemType: string | null;
  instance: string;
  versionControl: boolean;
  autoSave: boolean;
  listForSchemaId: string | null;
  meta: TrackerMeta | null;
  schemaVersion: number;

  nodes: TrackerNodeRow[];
  fields: TrackerFieldRow[];
  layoutNodes: TrackerLayoutNodeRow[];
  bindings: TrackerBindingRow[];
  validations: TrackerValidationRow[];
  calculations: TrackerCalculationRow[];
  dynamicOptions: TrackerDynamicOptionRow[];
  fieldRules: TrackerFieldRuleRow[];
}
