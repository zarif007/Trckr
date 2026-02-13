# Depends On options

Technical documentation for the **Depends On options** feature: how the Shared tab gets a "Depends On options" section with a Rules table, and how rule rows are converted to and from the `dependsOn` rule list.

---

## What it is

- **Purpose:** Let users configure **conditional field behavior** (hide, require, disable, or set a value) via a **Rules** table in the **Shared** tab, instead of editing raw `dependsOn` config.
- **Behavior:** When the tracker has a Shared tab, the code ensures a "Depends On options" section and a "Rules" grid exist. Each row in that grid is one rule: source field, operator, value, action, set value, and target fields. Options for source/target/operator/action/set come from **dynamic-options** (by function id), not from this package.
- **Bidirectional:** Existing `dependsOn` rules are turned into seed rows for the Rules grid; when the user edits the grid, rows are converted back to `DependsOnRule[]` and used as the effective `dependsOn` for the display.

---

## What it does

1. **Ensure structure**  
   `ensureDependsOnOptionGrids(input)`:
   - Adds a section `depends_on_options_section` ("Depends On options") on the Shared tab if missing.
   - Adds a grid `depends_on_rules_grid` ("Rules", type table) in that section if missing.
   - Adds the rule columns as fields and layout nodes if missing: Source, Operator, Value, Action, Set, Targets.
   - Returns augmented `sections`, `grids`, `fields`, `layoutNodes`, `bindings`, and **seed gridData** for the Rules grid (current `dependsOn` as rows).

2. **Row → rules**  
   `rulesGridRowsToDependsOn(rows)` converts Rules grid rows (from `gridData[depends_on_rules_grid]`) into `DependsOnRule[]`. Rows without source or targets are skipped. Used so that add/edit in the Rules table drives the effective `dependsOn`.

3. **Stable IDs**  
   Constants `SHARED_TAB_ID`, `DEPENDS_ON_OPTIONS_SECTION_ID`, `DEPENDS_ON_RULES_GRID` are the single source of truth for section/grid ids so consumers can merge seed data and read the rules grid.

---

## How it works

### Flow

1. Consumer (e.g. `TrackerDisplayInline`) checks if the tracker has a Shared tab (`SHARED_TAB_ID`).
2. If yes, it calls `ensureDependsOnOptionGrids({ sections, grids, fields, layoutNodes, bindings, dependsOn })`.
3. The result is used as the effective structure (sections, grids, fields, layout) and `seedGridData` is merged into the initial grid data.
4. When resolving which fields to hide/require/disable/set, the consumer derives `dependsOn` from the current grid data: `rulesGridRowsToDependsOn(gridData[DEPENDS_ON_RULES_GRID])`.
5. So: **input** `dependsOn` → seed rows; **user edits** → grid rows → **output** `dependsOn`.

### Rules grid columns

| Column ID       | Label   | Type                | Dynamic options function   | Required |
|----------------|---------|---------------------|----------------------------|----------|
| `rule_source`  | Source  | dynamic_select      | all_field_paths            | Yes      |
| `rule_operator`| Operator| dynamic_select      | all_operators              | Yes      |
| `rule_value`   | Value   | string              | —                          | No       |
| `rule_action`  | Action  | dynamic_select      | all_actions                | Yes      |
| `rule_set`     | Set     | dynamic_select      | all_rule_set_values        | No       |
| `rule_targets` | Targets | dynamic_multiselect | all_field_paths            | Yes      |

Column definitions (ids, labels, types, required, dynamic function id) live in **rules-grid-spec.ts** so adding or changing a column is one place.

### Dependencies

- **Tracker display types:** `TrackerGrid`, `TrackerField`, `TrackerSection`, `TrackerLayoutNode` from `@/app/components/tracker-display/types`.
- **Depends-on types:** `DependsOnRule`, `DependsOnRules` from `@/lib/depends-on`.
- **Dynamic options:** This package only imports **ids** (e.g. `DYNAMIC_OPTIONS_ALL_FIELD_PATHS`) from `@/lib/dynamic-options` to set `field.config.dynamicOptionsFunction`. Resolving options at runtime is done by the **binding** module / UI using `getDynamicOptions`, so no circular dependency.

---

## Folder structure

```
lib/depends-on-options/
├── README.md           # This file
├── index.ts            # Public API: constants, types, ensureDependsOnOptionGrids, rulesGridRowsToDependsOn
├── constants.ts        # SHARED_TAB_ID, DEPENDS_ON_OPTIONS_SECTION_ID, DEPENDS_ON_RULES_GRID
├── types.ts            # DependsOnOptionGridsInput, DependsOnOptionGridsResult
├── rules-grid-spec.ts  # Rules table column definitions and buildRulesGridField()
├── ensure-grids.ts     # ensureDependsOnOptionGrids()
└── rules-to-depends-on.ts  # rulesGridRowsToDependsOn()
```

- **constants** — Stable ids for tab, section, and grid; shared with consumers.
- **types** — Input/output for `ensureDependsOnOptionGrids`.
- **rules-grid-spec** — Single source of truth for Rules grid columns (ids, labels, data types, required, dynamic function id); used by `ensure-grids` to create fields and layout.
- **ensure-grids** — Ensures section/grid/fields/layout exist and builds seed gridData from `dependsOn`.
- **rules-to-depends-on** — Converts grid rows back to `DependsOnRule[]`.

---

## Public API

Import from `@/lib/depends-on-options`:

| Export                         | Description |
|--------------------------------|-------------|
| `SHARED_TAB_ID`                | Tab id for the Shared tab (`'shared_tab'`). |
| `DEPENDS_ON_OPTIONS_SECTION_ID`| Section id for "Depends On options" (`'depends_on_options_section'`). |
| `DEPENDS_ON_RULES_GRID`       | Grid id for the Rules table (`'depends_on_rules_grid'`). |
| `DependsOnOptionGridsInput`   | Input type for `ensureDependsOnOptionGrids`. |
| `DependsOnOptionGridsResult`   | Return type of `ensureDependsOnOptionGrids`. |
| `ensureDependsOnOptionGrids(input)` | Ensures Depends On section/grid/fields exist; returns augmented structure + seed gridData. |
| `rulesGridRowsToDependsOn(rows)`   | Converts Rules grid rows to `DependsOnRule[]`. |

---

## Extending the Rules grid

To add or change a column:

1. **Update `rules-grid-spec.ts`:**
   - Add the field id to `RULES_GRID_FIELD_IDS` (and keep order).
   - Add label in `RULES_GRID_FIELD_LABELS`.
   - If options come from dynamic-options, add the function id in `RULES_GRID_DYNAMIC_FUNCTION`; otherwise the column can be e.g. `string`.
   - Adjust `isRulesGridFieldMulti`, `getRulesGridFieldDataType`, `isRulesGridFieldRequired` if the new column has different behavior.
   - `buildRulesGridField` will then include the new column automatically.

2. **Update `rules-to-depends-on.ts`** if the new column maps to a property on `DependsOnRule` (e.g. read `row.new_column` and set `rule.newProp`).

3. **Update `ensure-grids.ts`** only if you need custom seed logic: extend `dependsOnToGridRows` to map the new rule property into the row shape.

No changes are required in `constants.ts` or the consumer for adding a column; only the spec and the row ↔ rule conversion.
