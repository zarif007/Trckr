# Bindings grid

Technical documentation for the **bindings-grid** module: the editable Bindings table on the Shared tab. It defines the grid structure, column spec, and conversion between the bindings object and grid rows so users can view and edit field mappings in a table.

---

## What it is

- **Purpose:** (1) **Ensure** the Bindings section and `bindings_grid` exist on the Shared tab (section, grid, fields, layoutNodes). (2) **Define** column ids, labels, data types, and dynamic-options functions for each column. (3) **Convert** between the tracker `bindings` object (keyed by `grid_id.field_id`) and grid row shape for display and saving.
- **Consumers:** Tracker display uses `ensureBindingsGrid` when the Shared tab is in view; grid data for `bindings_grid` is converted to/from bindings via `bindingsToGridRows` / `bindingsGridRowsToBindings` so edits in the table drive effective bindings immediately.

---

## What it does

1. **Constants** (`constants.ts`)  
   - `BINDINGS_SECTION_ID` — section id for the Bindings block (`field_mappings_section`).  
   - `BINDINGS_GRID_ID` — grid id (`bindings_grid`).  
   - `BINDINGS_GRID_FIELD_IDS` — column ids: `binding_select_field`, `binding_options_grid`, `binding_label_field`, `binding_fields_mapping`.  
   - `BindingsGridFieldId` — type for those ids.

2. **Spec** (`spec.ts`)  
   - Labels and data types per column (select field, options grid, label field, fields mapping).  
   - Dynamic option function per column (`all_field_paths`, `all_grids`, `all_field_paths_including_shared`).  
   - `buildBindingsGridField(fieldId)` — returns a `TrackerField` for the grid (used by `ensureBindingsGrid`).  
   - Fields mapping column uses dataType `field_mappings` (array of `{ from, to }` pairs).

3. **Ensure grid** (`ensure-grid.ts`)  
   - `ensureBindingsGrid(input)` — ensures the Bindings section and grid exist on the Shared tab; adds fields and layoutNodes for each column; returns augmented sections, grids, fields, layoutNodes and **seedGridData** for `bindings_grid` from current bindings.  
   - Does not mutate the input; returns new arrays with the Bindings section/grid/fields/layoutNodes added if missing.

4. **Rows** (`rows.ts`)  
   - `bindingsToGridRows(bindings)` — converts `TrackerBindings` to an array of row objects (one row per binding entry; columns: select field path, options grid id, label field path, fields mapping as `FieldMapping[]`).  
   - `bindingsGridRowsToBindings(rows)` — converts grid rows back to `TrackerBindings`; ensures the value mapping (labelField → select field) exists; skips invalid rows.  
   - `BindingsGridRow` — type for a single row.  
   - Fields mapping is stored as explicit `[{ from, to }, ...]` (no order dependency between columns).

---

## How it works

### Display flow

1. When the Shared tab is in view, the display calls `ensureBindingsGrid({ sections, grids, fields, layoutNodes, bindings })` and merges the result into the normalized schema and base grid data.  
2. `seedGridData[BINDINGS_GRID_ID]` is set from `bindingsToGridRows(bindings)` so the table shows current bindings.  
3. The Bindings table is rendered as a normal data table; cell updates go to grid data for `bindings_grid`.

### Effective bindings

1. Consumer (e.g. `TrackerDisplayInline`) derives **effectiveBindings** from `gridData[BINDINGS_GRID_ID]` via `bindingsGridRowsToBindings(rows)`.  
2. So edits in the Bindings table update effective bindings immediately without persisting to the saved schema until a separate save step.

### Row shape

| Column                     | Meaning              | Data type / options source                    |
|----------------------------|----------------------|-----------------------------------------------|
| `binding_select_field`     | Select field path    | `dynamic_select` / `all_field_paths`         |
| `binding_options_grid`     | Options grid id      | `dynamic_select` / `all_grids`                |
| `binding_label_field`      | Label field path     | `dynamic_select` / `all_field_paths_including_shared` |
| `binding_fields_mapping`   | From→to pairs        | `field_mappings` / `all_field_paths_including_shared` |

---

## Folder structure

```
lib/bindings-grid/
├── README.md       # This file
├── index.ts        # Public API re-exports
├── constants.ts    # Section/grid/column ids
├── spec.ts        # Column labels, data types, dynamic functions, buildBindingsGridField
├── ensure-grid.ts  # ensureBindingsGrid
└── rows.ts        # bindingsToGridRows, bindingsGridRowsToBindings, BindingsGridRow
```

---

## Public API

Import from `@/lib/bindings-grid`:

| Export | Description |
|--------|-------------|
| **Constants** | |
| `BINDINGS_SECTION_ID` | Section id for the Bindings block. |
| `BINDINGS_GRID_ID` | Grid id for the Bindings table. |
| `BINDINGS_GRID_FIELD_IDS` | Column id tuple. |
| `BindingsGridFieldId` | Type for column ids. |
| **Ensure grid** | |
| `ensureBindingsGrid(input)` | Ensure Bindings section/grid/fields exist; return augmented schema + seedGridData. |
| `EnsureBindingsGridInput` | Sections, grids, fields, layoutNodes, bindings. |
| `EnsureBindingsGridResult` | Augmented schema + seedGridData. |
| **Rows** | |
| `bindingsToGridRows(bindings)` | Bindings → grid rows. |
| `bindingsGridRowsToBindings(rows)` | Grid rows → bindings. |
| `BindingsGridRow` | Type for one row. |

Spec helpers (`buildBindingsGridField`, `BINDINGS_GRID_FIELD_LABELS`, etc.) are used internally by `ensureBindingsGrid` and by the display when building field metadata for the grid; they are not re-exported from the index.

---

## Dependencies

- **lib/types/tracker-bindings** — `TrackerBindings`, `TrackerBindingEntry`, `FieldMapping`.  
- **lib/depends-on-options** — `SHARED_TAB_ID` for the Shared tab.  
- **lib/dynamic-options** — `all_field_paths`, `all_grids`, `all_field_paths_including_shared` for column options.  
- **app/components/tracker-display/types** — `TrackerGrid`, `TrackerField`, `TrackerSection`, `TrackerLayoutNode`.
