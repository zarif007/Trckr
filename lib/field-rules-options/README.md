# Field rules options

Shared-tab scaffolding for a **Rules** grid: stable section/grid ids, column spec, and conversion from grid rows to `FieldRule[]`.

Rules are primarily edited per target field in **Field settings → Field rules**. `ensureFieldRulesOptionGrids` is currently a no-op (returns input unchanged) but kept for callers that still invoke it.

## Constants

| Export | Value |
|--------|--------|
| `SHARED_TAB_ID` | `shared_tab` |
| `FIELD_RULES_OPTIONS_SECTION_ID` | `field_rules_options_section` |
| `FIELD_RULES_RULES_GRID` | `field_rules_rules_grid` |

## API

- `ensureFieldRulesOptionGrids(input)` — passthrough + empty `seedGridData`
- `rulesGridRowsToFieldRules(rows)` — `FieldRule[]` from Rules grid rows

Import from `@/lib/field-rules-options`.
