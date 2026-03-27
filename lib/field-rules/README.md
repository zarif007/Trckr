# Field rules

Technical documentation for the **field rules** engine: conditional field behavior (hide, require, disable) defined by rules and resolved from grid data.

## Purpose

Evaluate **field rules** against current grid data and produce **per-field overrides** (`isHidden`, `isRequired`, `isDisabled`) for a given grid and row. No UI here—only types, condition evaluation, indexing, and resolution.

## Consumers

Tracker grids (table, div, kanban), data-table cells, and entry-form dialog use the index and `resolveFieldRuleOverrides`. **field-rules-options** supplies Shared-tab scaffolding types and row conversion helpers.

## Modules

| File | Role |
|------|------|
| `types.ts` | `FieldRule`, `FieldRules`, `FieldRuleOperator`, `FieldRuleAction`, `FieldRuleForTarget`, `FieldOverride`, `FieldRuleIndex`, `EnrichedFieldRule`, `ParsedPath`, `ResolveFieldRuleOptions` |
| `compare.ts` | `normalizeOperator`, `compareValues`, `compileCompare`, `isEmptyValue` |
| `index-build.ts` | `buildFieldRuleIndex(rules)` — maps by source, target, grid |
| `index-query.ts` | `getRulesForGrid`, `getRulesForSource`, `filterFieldRulesForGrid` |
| `effective.ts` | `getEffectiveFieldRules(schema)` — flatten `fieldRulesByTarget` or use `fieldRules` array |
| `resolve.ts` | `resolveFieldRuleOverrides(...)` — per-row overrides |
| `overrides.ts` | `applyFieldOverrides` — merge override onto field config |

## Relation to field-rules-options

**field-rules** (this package): rule model and evaluation. **field-rules-options**: optional Shared-tab Rules grid scaffolding and `rulesGridRowsToFieldRules` for row conversion.

Import from `@/lib/field-rules`.
