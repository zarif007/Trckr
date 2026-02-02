# Tracker schema

Trckr uses a flat array-based schema: tabs, sections, grids, fields, layoutNodes, optionTables, optionMaps, bindings. Relationships are by ID references, not nesting.

## ID naming conventions

- **Tabs**: snake_case, MUST end with `_tab` (e.g. `overview_tab`, `shared_tab`).
- **Sections**: snake_case, MUST end with `_section` (e.g. `main_section`, `option_lists_section`).
- **Grids**: snake_case, MUST end with `_grid` (e.g. `tasks_grid`, `meta_grid`).
- **Fields**: snake_case, no suffix (e.g. `due_date`, `status`, `title`).

All IDs must be unique across the schema. The builder prompt and Zod schemas enforce these conventions so both AI agents and humans apply them consistently.

## Ordering

- **Tabs, sections, grids**: ordered by `placeId` (numeric). Lower values appear first.
- **Fields within a grid**: ordered by `layoutNodes[].order` (numeric). Each layoutNode links one field to one grid with an order.

## Bindings for select/multiselect (RECOMMENDED)

The `bindings` object is a top-level property that defines:
1. Where options come from for each select/multiselect field
2. Auto-populate mappings when an option is selected

### Structure (paths are grid.field – no tab)

The stored value for the select is the `from` of the fieldMapping whose `to` is this select field path.

```json
{
  "bindings": {
    "<grid_id>.<field_id>": {
      "optionsGrid": "<grid_id>",
      "labelField": "<grid_id>.<field_id>",
      "fieldMappings": [
        { "from": "<options_grid>.<value_field>", "to": "<this_grid>.<this_field>" },
        { "from": "<options_grid>.<field>", "to": "<main_grid>.<other_field>" }
      ]
    }
  }
}
```

### Example - Product select with price auto-fill

When user selects a product, the price field auto-populates. The value mapping has `to` = the select field:

```json
{
  "bindings": {
    "orders_grid.product": {
      "optionsGrid": "product_options_grid",
      "labelField": "product_options_grid.product_label",
      "fieldMappings": [
        { "from": "product_options_grid.product_value", "to": "orders_grid.product" },
        { "from": "product_options_grid.product_price", "to": "orders_grid.price" }
      ]
    }
  }
}
```

### Path format (no tab)

- **optionsGrid**: grid id only (e.g., `product_options_grid`)
- **Field path**: `grid_id.field_id` (e.g., `product_options_grid.label`, `orders_grid.product`)

## Legacy option sources (DEPRECATED)

The following are deprecated. Use `bindings` instead:

- **optionMapId**: options come from a table grid in the Shared tab.
- **optionTableId**: options come from an inline list in `optionTables`.

These are kept for backward compatibility and will be auto-converted to bindings.

## Auto-fix functions

### autoFixBindings()

Creates missing bindings entries for select/multiselect fields:
1. Converts legacy `optionMapId` references to bindings format
2. Creates Shared tab infrastructure for fields without option sources
3. Generates default bindings entries

## Validation

The `validateBindings()` function checks:
- All binding keys reference existing tabs/grids/fields
- All paths (optionsGrid, labelField, valueField, fieldMappings) are valid
- All select/multiselect fields have bindings or legacy option sources

Validation issues are returned as warnings (not errors) - invalid bindings are skipped at runtime.
