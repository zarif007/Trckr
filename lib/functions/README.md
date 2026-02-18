# Functions (Expression Engine)

Trckr uses a shared, JSON-based expression engine for **validations** (now) and **computations** (later). The goal is a safe, deterministic format that is easy for both manual builders and LLMs to generate.

## Why this exists

- No `eval` or arbitrary code execution
- JSON-serializable and table-friendly
- Reusable for multiple features (validations, computations)

## Expression AST

Each expression is a tree of nodes. Nodes are plain JSON objects.

### Node types

- `const` — literal value
- `field` — read a field value from the current row
- `add`, `mul` — numeric aggregation
- `sub`, `div` — numeric math
- `eq`, `neq`, `gt`, `gte`, `lt`, `lte` — comparisons
- `and`, `or`, `not` — boolean logic
- `if` — conditional branching
- `regex` — regex match against a string value

Example (a = (b * 10) + (c * 5)):

```json
{
  "op": "eq",
  "left": { "op": "field", "fieldId": "a" },
  "right": {
    "op": "add",
    "args": [
      { "op": "mul", "args": [
        { "op": "field", "fieldId": "b" },
        { "op": "const", "value": 10 }
      ]},
      { "op": "mul", "args": [
        { "op": "field", "fieldId": "c" },
        { "op": "const", "value": 5 }
      ]}
    ]
  }
}
```

## Validation rules (top-level `validations`)

Validations are stored as a **top-level map** keyed by `fieldId`:

```json
{
  "validations": {
    "sku": [
      { "type": "required", "message": "Required" },
      {
        "type": "expr",
        "expr": {
          "op": "regex",
          "value": { "op": "field", "fieldId": "sku" },
          "pattern": "^[A-Z]{2}\\d{4}$"
        },
        "message": "Format: AA0000"
      }
    ]
  }
}
```

The validation pipeline is:
1. Config constraints (`isRequired`, `min`, `max`, `minLength`, `maxLength`)
2. `validations[fieldId]` rules in order

First failing rule returns the error message.

## Safety

- No string evaluation or code execution
- Expressions are validated before use
- Unknown operators are rejected by schema validation

## Extending

To add new operators, register a custom evaluator in `lib/functions/registry.ts`.
Future computation features can reuse the same AST without changes.
