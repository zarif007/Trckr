# Tracker schema

Trckr uses a flat array-based schema: tabs, sections, grids, fields, layoutNodes, bindings. Relationships are by ID references, not nesting. Every select/multiselect field must have a bindings entry.

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

## Auto-fix and enrichment

### buildBindingsFromSchema()

Ensures every select/multiselect field has a bindings entry pointing to an options grid; creates missing options grids and Shared tab infrastructure. Preserves existing bindings' fieldMappings when present.

### enrichBindingsFromSchema()

After bindings exist, infers additional fieldMappings: for each binding, adds mappings from option-grid fields to main-grid fields when both grids have a field with the same id (e.g. options grid has `price`, main grid has `price` → auto-populate on select). Options grids can have extra columns (price, taste, etc.); same-named main grid fields are auto-filled when the user selects an option.

### autoFixBindings()

Creates missing bindings entries for select/multiselect fields: creates Shared tab infrastructure and default bindings (value mapping only). Run buildBindingsFromSchema and enrichBindingsFromSchema for full repair and auto-populate inference.

## Validation

The `validateBindings()` function checks:
- All binding keys reference existing grids/fields
- All paths (optionsGrid, labelField, fieldMappings) are valid
- All select/multiselect fields have a bindings entry

Validation issues are returned as warnings (not errors) - invalid bindings are skipped at runtime.

## Field validations (top-level)

Validations are stored in a top-level map keyed by `gridId.fieldId`:

```json
{
  "validations": {
    "main_grid.sku": [
      { "type": "required", "message": "Required" },
      {
        "type": "expr",
        "expr": {
          "op": "regex",
          "value": { "op": "field", "fieldId": "main_grid.sku" },
          "pattern": "^[A-Z]{2}\\\\d{4}$"
        },
        "message": "Format: AA0000"
      }
    ]
  }
}
```

Validation rules run after basic config constraints (`isRequired`, `min`, `max`, `minLength`, `maxLength`) and return the first failing error.

## Field calculations (top-level)

Calculations are stored in a top-level map keyed by target `gridId.fieldId`:

```json
{
  "calculations": {
    "sales_grid.amount": {
      "expr": {
        "op": "mul",
        "args": [
          { "op": "field", "fieldId": "sales_grid.rate" },
          { "op": "field", "fieldId": "sales_grid.quantity" }
        ]
      }
    }
  }
}
```

Each target field has one expression rule that computes the value for that field.
