# Tracker schema

Trckr uses a flat array-based schema: tabs, sections, grids, fields, layoutNodes, optionTables, optionMaps. Relationships are by ID references, not nesting.

## ID naming conventions

- **Tabs**: snake_case, MUST end with `_tab` (e.g. `overview_tab`, `shared_tab`).
- **Sections**: snake_case, MUST end with `_section` (e.g. `main_section`, `option_lists_section`).
- **Grids**: snake_case, MUST end with `_grid` (e.g. `tasks_grid`, `meta_grid`).
- **Fields**: snake_case, no suffix (e.g. `due_date`, `status`, `title`).

All IDs must be unique across the schema. The builder prompt and Zod schemas enforce these conventions so both AI agents and humans apply them consistently.

## Ordering

- **Tabs, sections, grids**: ordered by `placeId` (numeric). Lower values appear first.
- **Fields within a grid**: ordered by `layoutNodes[].order` (numeric). Each layoutNode links one field to one grid with an order.

## Option sources for select/multiselect

Every field with `dataType: "options"` or `"multiselect"` must have exactly one option source:

- **optionMapId**: options come from a table grid in the Shared tab. Set `config.optionMapId` to the id of an entry in `optionMaps`. That entry points to `(tabId, gridId)` where rows provide label/value.
- **optionTableId**: options come from an inline list. Set `config.optionTableId` to the id of an entry in `optionTables`. That entry has `options: [{ label, value }, ...]`.

Use optionMapId when options should be editable in the UI (Shared tab); use optionTableId for fixed lists.

## Auto-fix for missing optionMaps

The `autoFixOptionMaps()` function in `lib/validate-tracker.ts` automatically creates missing infrastructure when:

1. A field has `config.optionMapId` but no matching entry in `optionMaps`
2. A field has `dataType: "options"` or `"multiselect"` but no option source at all

The auto-fix creates:
- **Shared tab** (`shared_tab`) if not present
- **Option Lists section** (`option_lists_section`) in the Shared tab
- **Options table grid** for each missing optionMap (e.g. `priority_options_grid`)
- **Label and value fields** for each options grid
- **Layout nodes** connecting fields to grids
- **optionMaps entry** linking `optionMapId` to the grid

This ensures options/multiselect fields always have a working option source visible in the Shared tab.
