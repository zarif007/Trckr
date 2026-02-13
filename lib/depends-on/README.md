# Depends-on

Technical documentation for the **depends-on** rule engine: how conditional field behavior (hide, require, disable, set value) is defined by rules and resolved from grid data.

---

## What it is

- **Purpose:** Evaluate **depends-on rules** against current grid data and produce **per-field overrides** (isHidden, isRequired, isDisabled, value) for a given grid and row. No UI here—only types, condition evaluation, indexing, and resolution.
- **Rule shape:** Each rule has a **source** (field path), **operator** (eq, in, contains, …), **value**, **action** (isHidden, isRequired, isDisabled, set), optional **set** (boolean or value), and **targets** (field paths). When the source value matches the condition, the action is applied to the target fields.
- **Consumers:** Tracker grids (table, div, kanban), data-table cells, and entry-form dialog use the index and `resolveDependsOnOverrides`; **depends-on-options** uses only the types (`DependsOnRule`, `DependsOnRules`) to define the Rules grid and convert rows ↔ rules.

---

## What it does

1. **Types** (`types.ts`)  
   Defines `DependsOnRule`, `DependsOnRules`, `DependsOnOperator`, `DependsOnAction`, `FieldOverride`, `DependsOnIndex`, `EnrichedDependsOnRule`, `ParsedPath`, `ResolveDependsOnOptions`. Single source of truth for the rule model.

2. **Condition evaluation** (`compare.ts`)  
   - `normalizeOperator(op)` — normalizes `=`/`==` → `eq`, `!=`/`!==` → `neq`.  
   - `compareValues(sourceValue, operator, expected)` — returns whether the source value matches the condition (eq, neq, gt, in, contains, is_empty, etc.).  
   - `compileCompare(operator, expected)` — returns a function `(sourceValue) => boolean` for use in the index (avoids re-parsing in hot paths).

3. **Index build** (`index-build.ts`)  
   `buildDependsOnIndex(rules)` parses each rule’s source and targets, compiles the compare function, and builds three maps: **rulesBySource**, **rulesByTarget**, **rulesByGridId**. Rules are stored as `EnrichedDependsOnRule` (with `_parsedSource`, `_parsedTargets`, `_compare`). O(1) lookup for “which rules affect this grid?” or “which rules depend on this source path?”.

4. **Index query** (`index-query.ts`)  
   - `getRulesForGrid(index, gridId)` — rules that target the given grid.  
   - `getRulesForSource(index, sourcePath)` — rules that use the given source path (e.g. for invalidation).  
   - `filterDependsOnRulesForGrid(rules, gridId)` — convenience: build index and return rules for that grid.

5. **Overrides merge** (`overrides.ts`)  
   `applyFieldOverrides(base, override)` merges a `FieldOverride` onto a base config object. Override values win when defined. Used by cells and forms to apply resolved overrides (hidden, required, disabled, value) to field config.

6. **Resolution** (`resolve.ts`)  
   `resolveDependsOnOverrides(rules, gridData, targetGridId, rowIndex, rowDataOverride?, options?)` returns `Record<fieldId, FieldOverride>` for the given row. For each rule it: reads the source value from grid data (or `rowDataOverride` when same-grid and option `onlyUseRowDataForSource` or override has the field); runs the condition; if it matches, applies the action to each target field in that grid. Priority and order break ties; for isHidden, “show” rules (set false) are handled so a field is hidden only if no show rule wins.

---

## How it works

### Flow

1. **Index once per grid/render:** Consumer calls `buildDependsOnIndex(dependsOn)`, then `getRulesForGrid(index, gridId)` to get rules that affect that grid.
2. **Resolve per row:** For each row (and optionally for an “add” row with `rowDataOverride`), call `resolveDependsOnOverrides(rules, gridData, targetGridId, rowIndex, rowDataOverride?, options?)`. Result is overrides keyed by field id.
3. **Apply to UI:** For each cell/field, call `applyFieldOverrides(fieldConfig, overrides[fieldId])` and use the result for visibility, required, disabled, and value.

### Operators

| Operator        | Description |
|----------------|-------------|
| `eq`, `=`, `==` | Equals (value or string coercion). |
| `neq`, `!=`, `!==` | Not equals. |
| `gt`, `>`, `gte`, `>=`, `lt`, `<`, `lte`, `<=` | Numeric comparison (non-numeric → false). |
| `in`, `not_in` | Value in list (or single value); list from rule value. |
| `contains`, `not_contains` | Array includes value, or string includes substring. |
| `starts_with`, `ends_with` | String prefix/suffix. |
| `is_empty`, `not_empty` | Source is empty (undefined, null, `''`, or `[]`). |

### Actions

| Action     | Effect on target fields |
|-----------|--------------------------|
| `isHidden` | Override `isHidden` (rule’s `set`, default true). |
| `isRequired` | Override `isRequired`. |
| `isDisabled` | Override `isDisabled`. |
| `set`     | Override `value` (rule’s `set`). |

### Dependencies

- **lib/types/tracker-bindings:** `FieldPath` (dot-notation path string).
- **lib/resolve-bindings:** `parsePath`, `getValueByPath` for reading source values from grid data.

No dependency on **depends-on-options** or **dynamic-options**; they depend on this module for types (and optionally for resolution if they ever need it).

---

## Folder structure

```
lib/depends-on/
├── README.md       # This file
├── index.ts        # Public API re-exports
├── types.ts        # Rule, override, index, and option types
├── compare.ts      # Operator normalization and condition evaluation
├── index-build.ts  # buildDependsOnIndex()
├── index-query.ts  # getRulesForGrid, getRulesForSource, filterDependsOnRulesForGrid
├── overrides.ts    # applyFieldOverrides()
└── resolve.ts      # resolveDependsOnOverrides()
```

- **types** — Rule shape, overrides, index shape, options.  
- **compare** — Pure condition logic; no I/O. Used by index-build (compile) and resolve (fallback when no _compare).  
- **index-build** — Parses paths, compiles compare, fills the three maps.  
- **index-query** — Read from the index; filterDependsOnRulesForGrid builds index then queries.  
- **overrides** — Merge FieldOverride onto base config.  
- **resolve** — Full resolution: read source values, evaluate conditions, apply actions, apply priority/order and isHidden show-rule handling.

---

## Public API

Import from `@/lib/depends-on`:

| Export | Description |
|--------|-------------|
| **Types** | |
| `DependsOnOperator` | Union of supported comparison operators. |
| `DependsOnAction` | `'isHidden' \| 'isRequired' \| 'isDisabled' \| 'set'`. |
| `DependsOnRule` | Rule: source, operator?, value?, action, set?, targets, priority?. |
| `DependsOnRules` | `DependsOnRule[]`. |
| `ParsedPath` | `{ tabId: null, gridId, fieldId }`. |
| `EnrichedDependsOnRule` | Rule + _parsedSource, _parsedTargets, _compare. |
| `FieldOverride` | `{ isHidden?, isRequired?, isDisabled?, value? }`. |
| `DependsOnIndex` | `{ rulesBySource, rulesByTarget, rulesByGridId }`. |
| `ResolveDependsOnOptions` | `{ onlyUseRowDataForSource? }`. |
| **Index** | |
| `buildDependsOnIndex(rules)` | Build index and enriched rules. |
| `getRulesForGrid(index, gridId)` | Rules targeting the grid. |
| `getRulesForSource(index, sourcePath)` | Rules using that source path. |
| `filterDependsOnRulesForGrid(rules, gridId)` | Rules that target the grid. |
| **Overrides** | |
| `applyFieldOverrides(base, override)` | Merge override onto base config. |
| **Resolution** | |
| `resolveDependsOnOverrides(rules, gridData, targetGridId, rowIndex, rowDataOverride?, options?)` | Per-field overrides for the row. |

---

## Relation to depends-on-options

- **depends-on** (this package): Defines the rule model and evaluates rules → overrides. No UI.  
- **depends-on-options**: Ensures the Shared tab has a Rules grid and converts grid rows ↔ `DependsOnRule[]`. It imports only **types** from this package (`DependsOnRule`, `DependsOnRules`); the Rules table is the UI that produces/consumes the same rules this engine evaluates.
