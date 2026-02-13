# Resolve-bindings

Technical documentation for the **binding resolution engine**: how select/multiselect fields are wired to option grids, how options are resolved, and how choosing an option propagates values to other fields.

---

## What it is

- **Purpose:** Parse dot-notation field paths, read/write grid data by path, resolve **options** for bound select fields from option grids, and **apply bindings** (compute which target fields to update when the user picks an option). No UI—only path handling, grid access, and binding logic.
- **Binding shape:** Each binding has `optionsGrid`, `labelField`, and `fieldMappings` (from option row field → to main grid field). One mapping has `to` = the select field path (label/value); others define auto-populated fields when an option is selected.
- **Consumers:** Tracker grids (table, div, kanban) use `getBindingForField`, `findOptionRow`, `applyBindings`, and `resolveOptionsFromBinding`; the **binding** module uses path and lookup for schema build and option resolution; **depends-on** uses `parsePath` and `getValueByPath` for source values.

---

## What it does

1. **Types** (`types.ts`)  
   Defines `ParsedPath` (tabId, gridId, fieldId). `FieldPath` and binding entry types live in `@/lib/types/tracker-bindings`.

2. **Debug** (`debug.ts`)  
   `isBindingDebugEnabled()`, `enableBindingDebug()`, `disableBindingDebug()`, `debugLog()`. Debug is driven by `localStorage.BINDING_DEBUG === 'true'`. Used by options and apply modules for verbose logging.

3. **Path** (`path.ts`)  
   - `parsePath(path)` — parse `"grid_id.field_id"` or `"grid_id"` or legacy `"tab.grid.field"` into `ParsedPath`.  
   - `buildFieldPath(gridId, fieldId)` — build `"grid_id.field_id"`.  
   - `normalizeOptionsGridId(optionsGrid)` — strip optional tab prefix from options grid string.

4. **Grid data** (`grid-data.ts`)  
   - `getValueByPath(gridData, path, rowIndex)` — read one cell; returns `undefined` if path or row invalid.  
   - `setValueByPath(gridData, path, rowIndex, value)` — immutable update; returns new gridData or unchanged if invalid.  
   Uses `parsePath`; invalid paths log a warning and are handled gracefully.

5. **Value field** (`value-field.ts`)  
   `getValueFieldIdFromBinding(binding, selectFieldPath)` — which option-row field holds the **stored value** for this select. Prefers fieldMapping where `to === selectFieldPath`; falls back to deprecated `valueField` then `labelField`.

6. **Options** (`options.ts`)  
   - `findOptionRow(gridData, binding, selectedValue, selectFieldPath)` — find the option row matching the selected value (value field → label → `opt-N` index → `row.id`).  
   - `resolveOptionsFromBinding(binding, gridData, selectFieldPath)` — build `{ id, label, value }[]` for the Select component.  
   - `getFullOptionRows(binding, gridData)` — all option rows (full row objects).

7. **Apply** (`apply.ts`)  
   `applyBindings(binding, optionRow, selectFieldPath)` — returns `{ targetPath, value }[]` for every fieldMapping except the one whose `to` is the select field. Used to apply auto-populated values when the user selects an option.

8. **Option row** (`option-row.ts`)  
   `buildNewOptionRow(binding, selectFieldPath, label, value?)` — build a new row to add to the options grid (label + value fields). Returns `{ optionsGridId, newRow }`.

9. **Lookup** (`lookup.ts`)  
   - `getBindingForField(gridId, fieldId, bindings?, tabId?)` — get binding by `"grid_id.field_id"` or legacy `"tab.grid.field"`.  
   - `hasBinding(gridId, fieldId, bindings)` — boolean.

10. **Initial** (`initial.ts`)  
    `getInitialGridDataFromBindings(bindings)` — build initial gridData with all option grids as empty arrays. Used to seed state when bindings exist but no data yet.

---

## How it works

### Path format

- **Canonical:** `"grid_id.field_id"` (no tab in the key).  
- **Legacy:** `"tab_id.grid_id.field_id"` is parsed (gridId = parts[1], fieldId = parts[2]); lookup supports legacy key when `tabId` is passed.  
- **Options grid only:** `"grid_id"` (one part) yields `fieldId: null`.

### Flow: rendering a bound select

1. Grid has `gridId`, `fieldId`, `bindings`, `gridData`.  
2. `getBindingForField(gridId, fieldId, bindings, tabId)` → binding or undefined.  
3. If binding: `resolveOptionsFromBinding(binding, gridData, selectFieldPath)` → options for the dropdown.  
4. Current value comes from `getValueByPath(gridData, selectFieldPath, rowIndex)` (or from row data).  
5. Select component shows options and current value; onChange will call the grid’s handler.

### Flow: user selects an option

1. Handler has `selectedValue`, `binding`, `selectFieldPath`, `gridData`, `rowIndex`.  
2. `findOptionRow(gridData, binding, selectedValue, selectFieldPath)` → option row (or undefined).  
3. `applyBindings(binding, optionRow, selectFieldPath)` → `[{ targetPath, value }, ...]`.  
4. Grid updates: set select field to `selectedValue`, then for each `{ targetPath, value }` call `setValueByPath` (or equivalent) to apply auto-populated fields.  
5. Optionally add new options via `buildNewOptionRow` and append to the option grid.

### Option row matching order

When finding the row for a selected value:

1. Match on **value field** (from fieldMapping / valueField / labelField).  
2. Match on **label field** if value field didn’t match.  
3. If value is `"opt-N"`, treat N as row index (fallback for generated ids).  
4. Match on **row.id**.

All comparisons use value equality or `String(...)` equality.

### Debug

- Set `localStorage.BINDING_DEBUG = 'true'` or call `enableBindingDebug()`, then refresh.  
- `debugLog()` is used in `findOptionRow`, `resolveOptionsFromBinding`, and `applyBindings` for detailed logs.  
- Disable with `disableBindingDebug()` or by removing `BINDING_DEBUG` from localStorage.

---

## Folder structure

```
lib/resolve-bindings/
├── README.md     # This file
├── index.ts      # Public API re-exports
├── types.ts      # ParsedPath (path parsing result)
├── debug.ts      # Debug flag and debugLog
├── path.ts       # parsePath, buildFieldPath, normalizeOptionsGridId
├── grid-data.ts  # getValueByPath, setValueByPath
├── value-field.ts # getValueFieldIdFromBinding
├── options.ts    # findOptionRow, resolveOptionsFromBinding, getFullOptionRows
├── apply.ts      # applyBindings
├── option-row.ts # buildNewOptionRow
├── lookup.ts     # getBindingForField, hasBinding
└── initial.ts    # getInitialGridDataFromBindings
```

- **path** — Single place for path parsing and building; used by all other modules that need gridId/fieldId.  
- **grid-data** — Pure read/write by path; used by depends-on (read) and grids (read/write).  
- **value-field** — Binding → value field id; used by options and option-row.  
- **options** — Option list and row lookup; used by grids and the binding module.  
- **apply** — Option row → target updates; used by grids on select change.  
- **lookup** / **initial** — Binding index and initial state; used by grids and inline tracker.

---

## Public API

Import from `@/lib/resolve-bindings`:

| Export | Description |
|--------|-------------|
| **Types** | |
| `ParsedPath` | `{ tabId: null, gridId, fieldId }`. |
| `GridData` | `Record<string, Array<Record<string, unknown>>>`. |
| `BindingUpdate` | `{ targetPath: FieldPath, value: unknown }`. |
| `ResolvedOption` | `{ id: string, label: string, value: unknown }`. |
| `NewOptionRowResult` | `{ optionsGridId: string, newRow: Record<string, unknown> }`. |
| **Debug** | |
| `enableBindingDebug()` | Turn on binding debug logs. |
| `disableBindingDebug()` | Turn off binding debug logs. |
| **Path** | |
| `parsePath(path)` | Parse path string → ParsedPath. |
| `buildFieldPath(gridId, fieldId)` | Build "grid_id.field_id". |
| `normalizeOptionsGridId(optionsGrid)` | Strip tab prefix from options grid id. |
| **Grid data** | |
| `getValueByPath(gridData, path, rowIndex)` | Read cell by path. |
| `setValueByPath(gridData, path, rowIndex, value)` | Immutable write by path. |
| **Value field** | |
| `getValueFieldIdFromBinding(binding, selectFieldPath)` | Option row field id for stored value. |
| **Options** | |
| `findOptionRow(gridData, binding, selectedValue, selectFieldPath)` | Option row for selected value. |
| `resolveOptionsFromBinding(binding, gridData, selectFieldPath)` | Options array for Select. |
| `getFullOptionRows(binding, gridData)` | All option rows (full objects). |
| **Apply** | |
| `applyBindings(binding, optionRow, selectFieldPath)` | Target updates when option selected. |
| **Option row** | |
| `buildNewOptionRow(binding, selectFieldPath, label, value?)` | New row for options grid. |
| **Lookup** | |
| `getBindingForField(gridId, fieldId, bindings?, tabId?)` | Binding entry for field. |
| `hasBinding(gridId, fieldId, bindings)` | Whether field has a binding. |
| **Initial** | |
| `getInitialGridDataFromBindings(bindings)` | Empty gridData for all option grids. |

---

## Dependencies

- **lib/types/tracker-bindings:** `FieldPath`, `TrackerBindingEntry`, `TrackerBindings`, `FieldMapping`.  
- No dependency on **binding** or **depends-on**; those modules may import from resolve-bindings.
