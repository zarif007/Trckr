# Binding

Technical documentation for the **binding** module: building and enriching bindings from the tracker schema, and resolving options for select/multiselect fields (bindings, dynamic functions, or inline config).

---

## What it is

- **Purpose:** (1) **Build** bindings from schema so every options/multiselect field has a binding pointing to an options grid (creating Shared tab and option grids when missing). (2) **Enrich** bindings by inferring fieldMappings from option-grid and main-grid field ids. (3) **Resolve options** for a field from bindings + gridData, dynamic option functions, or inline `config.options`.
- **Consumers:** Tracker chat / AI flow uses `buildBindingsFromSchema` and `enrichBindingsFromSchema`; tracker grids (table, div, kanban) and options context use `TrackerContextForOptions`, `resolveFieldOptionsV2`, and `getFieldBinding`.

---

## What it does

1. **Types** (`types.ts`)  
   - `TrackerLike` — tracker schema shape used when building/enriching bindings (tabs, sections, grids, fields, layoutNodes, bindings).  
   - `TrackerContextForOptions` — alias for `DynamicOptionsContext` (grids, fields, layoutNodes?, sections?) passed when resolving options; matches dynamic-options so one context works for both bindings and dynamic selects.  
   - `ResolvedOption` — normalized option shape (label, value, id?) for Select/MultiSelect.

2. **Schema build** (`schema-build.ts`)  
   - `getOptionGridLabelAndValueFieldIds(gridId, layoutNodes)` — for an options grid, returns label and value field ids (single-field or legacy _label/_value).  
   - `buildBindingsFromSchema(tracker)` — for every options/multiselect field, ensures a binding exists pointing to an options grid (`{fieldId}_options_grid`). Creates Shared tab, Option Lists section, option grid, one option field, and layoutNodes when missing. Preserves existing fieldMappings; only adds missing value mapping. Returns the same tracker type with bindings (and structure) fixed.

3. **Enrich** (`enrich.ts`)  
   - `enrichBindingsFromSchema(tracker)` — infers additional fieldMappings from option-grid fields to main-grid fields. Does not remove existing mappings. Matching order: exact id, prefix `selectFieldId_mainFieldId`, suffix `_mainFieldId`, then core name (strip common prefixes/suffixes, min 3 chars). Returns tracker with enriched bindings only if something changed.

4. **Options** (`options.ts`)  
   - `resolveFieldOptionsLegacy(field, gridData?)` — options from inline `field.config.options` only.  
   - `resolveFieldOptionsV2(tabId, gridId, field, bindings, gridData, trackerContext?)` — options from bindings + gridData, or from dynamic option function (dynamic_select/dynamic_multiselect), or fallback to legacy.  
   - `getFieldBinding(gridId, fieldId, bindings?, tabId?)` — re-export from resolve-bindings for convenience.

---

## How it works

### Build flow

1. Call `buildBindingsFromSchema(tracker)` after loading or creating a tracker (e.g. in AI chat flow).  
2. For each field with `dataType === 'options' | 'multiselect'`, find its grid from layoutNodes.  
3. Ensure an options grid exists for that field (`{fieldId}_options_grid`); if not, create Shared tab, Option Lists section, grid, one option field, and layout node.  
4. Ensure a binding entry for `gridId.fieldId` with `optionsGrid`, `labelField`, and at least one fieldMapping (value mapping from option grid to this select field).  
5. Optionally call `enrichBindingsFromSchema(tracker)` to infer more mappings (e.g. option row `price` → main grid `price`).

### Option resolution flow

1. For a cell/field, the grid calls `resolveFieldOptionsV2(tabId, gridId, field, bindings, gridData, trackerContext)`.  
2. If field is `dynamic_select` or `dynamic_multiselect`, use `getDynamicOptions(field.config.dynamicOptionsFunction, trackerContext)`.  
3. Else if the field has a binding, use `getBindingForField` + `resolveOptionsFromBinding` (from resolve-bindings) to get options from the option grid rows.  
4. Else use `resolveFieldOptionsLegacy(field)` (inline `config.options`).  
5. Result is normalized to `ResolvedOption[]` (label, value, id).

### Enrich matching strategies

| Priority | Strategy | Example |
|----------|----------|---------|
| 1 | Exact | option `price` → main `price` |
| 2 | Prefix | option `product_price` → main `price` when select field is `product` |
| 3 | Suffix | option `unit_price` → main `price` |
| 4 | Core name | option `opt_price`, main `price_value` → match on `price` (min 3 chars) |

Label and value fields for the select are never mapped to other targets; they are reserved.

---

## Folder structure

```
lib/binding/
├── README.md       # This file
├── index.ts        # Public API re-exports
├── types.ts        # TrackerLike, TrackerContextForOptions, ResolvedOption
├── schema-build.ts # getOptionGridLabelAndValueFieldIds, buildBindingsFromSchema
├── enrich.ts       # enrichBindingsFromSchema
└── options.ts      # resolveFieldOptionsLegacy, resolveFieldOptionsV2, getFieldBinding
```

---

## Public API

Import from `@/lib/binding`:

| Export | Description |
|--------|-------------|
| **Types** | |
| `TrackerLike` | Tracker schema shape for build/enrich. |
| `TrackerContextForOptions` | Context for option resolution (= DynamicOptionsContext). |
| `ResolvedOption` | Normalized option: label, value, id?, [key: string]: unknown. |
| **Schema build** | |
| `getOptionGridLabelAndValueFieldIds(gridId, layoutNodes)` | Label and value field ids for an options grid. |
| `buildBindingsFromSchema(tracker)` | Ensure bindings and option grids for all options/multiselect fields. |
| **Enrich** | |
| `enrichBindingsFromSchema(tracker)` | Infer fieldMappings from option grid → main grid field ids. |
| **Options** | |
| `resolveFieldOptionsLegacy(field, gridData?)` | Options from inline config.options. |
| `resolveFieldOptionsV2(tabId, gridId, field, bindings, gridData, trackerContext?)` | Options from bindings, dynamic function, or legacy. |
| `getFieldBinding(gridId, fieldId, bindings?, tabId?)` | Binding entry for field (re-export from resolve-bindings). |

---

## Dependencies

- **lib/types/tracker-bindings** — options.ts uses `TrackerBindings`, `TrackerBindingEntry` for resolution.  
- **lib/resolve-bindings** — path/lookup and option resolution (`buildFieldPath`, `getBindingForField`, `resolveOptionsFromBinding`). enrich uses `normalizeOptionsGridId`.  
- **lib/dynamic-options** — `getDynamicOptions` for dynamic_select/dynamic_multiselect; types.ts uses `DynamicOptionsContext` for `TrackerContextForOptions`.

## See also

- **lib/bindings-grid** — Bindings table on the Shared tab: grid structure, column spec, and conversion between bindings and grid rows for editing.
