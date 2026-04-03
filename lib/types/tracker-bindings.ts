/**
 * Domain types for the tracker bindings system.
 * Used by resolve-bindings, binding, and UI components.
 */

/** Dot-notation path: "grid_id.field_id" (no tab) */
export type FieldPath = string;

/** Single field mapping for auto-population when an option is selected */
export type FieldMapping = {
  /** Path in options grid: "product_options_grid.price" */
  from: FieldPath;
  /** Path in main grid: "orders_grid.price" */
  to: FieldPath;
};

/** Binding entry for a select/multiselect field */
export type TrackerBindingEntry = {
  /**
   * When set, option rows are read from this tracker schema's instance data (same project).
   * Omit or undefined: options come from the current tracker's grid data.
   */
  optionsSourceSchemaId?: string;
  /**
   * Optional stable key for master data trackers (module/project scope). Used to
   * match a binding to a specific master data tracker spec.
   */
  optionsSourceKey?: string;
  /** Grid id containing options (e.g. "product_options_grid") within the source schema */
  optionsGrid: string;
  /** Path to the option field in options grid (e.g. "exercise_options_grid.exercise_option"). This field provides both display and stored value. The option field must have a different id than the select field. */
  labelField: FieldPath;
  /**
   * Field mappings: from option row field -> to main grid field.
   * Must include one mapping where "to" is this select field path and "from" is the same path as labelField.
   * Other mappings auto-populate when an option is selected.
   */
  fieldMappings: FieldMapping[];
};

/** Top-level bindings object. Key is "grid_id.field_id" */
export type TrackerBindings = Record<FieldPath, TrackerBindingEntry>;
