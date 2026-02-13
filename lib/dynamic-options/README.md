# Dynamic options

Tech doc for the **dynamic options** system: how tracker fields of type `dynamic_select` and `dynamic_multiselect` get their options from **functions** identified by id, instead of from bindings or static config.

---

## Overview

- **Problem:** Some fields need options that depend on tracker structure (e.g. “all field paths”, “all operators”) and can’t be fixed in bindings.
- **Solution:** A **registry** maps **function ids** (e.g. `all_field_paths`) to **functions** that take a **context** (grids, fields, optional layout/sections) and return a list of `{ value, label, id? }`.
- **Usage:** A field’s config sets `dynamicOptionsFunction: 'all_field_paths'`. At resolve time, the app calls `getDynamicOptions('all_field_paths', context)` and uses the returned options for that field.

No circular dependency: the registry and types live here; consumers (e.g. **binding**, depends-on-options) only import **ids** or **getDynamicOptions**.

---

## How it works

1. **Registration**  
   On app load, `lib/dynamic-options/index.ts` runs `registerBuiltInDynamicOptions()`, which registers each built-in function with the registry (id → function).

2. **Resolving options**  
   When the UI needs options for a `dynamic_select` / `dynamic_multiselect` field:
   - It reads `field.config.dynamicOptionsFunction` (the function id).
   - It calls `getDynamicOptions(functionId, context)`.
   - The registry looks up the function and calls it with `context`; the result is the option list (or `[]` if the id is unknown).

3. **Context**  
   `DynamicOptionsContext` provides:
   - `grids`, `fields` — tracker structure.
   - Optional: `layoutNodes` (gridId + fieldId), `sections` (id + tabId). Used e.g. by `all_field_paths` to restrict to fields that exist in the layout and to exclude shared-tab sections when desired.

---

## Folder structure

```
lib/dynamic-options/
├── README.md           # This file
├── index.ts            # Public API; runs built-in registration, re-exports types + registry
├── types.ts            # DynamicOption, DynamicOptionsContext, DynamicOptionsFn, built-in ids
├── registry.ts         # registerDynamicOptionsFunction, getDynamicOptions, getRegisteredDynamicOptionsIds
└── functions/          # One file per built-in function
    ├── index.ts        # registerBuiltInDynamicOptions() — registers all built-ins
    ├── all-field-paths.ts
    ├── all-operators.ts
    ├── all-actions.ts
    └── all-rule-set-values.ts
```

- **types** — Shared types and the list of known built-in ids (for validation and for consumers that need to reference an id).
- **registry** — In-memory map id → function; register and resolve only.
- **functions/** — Each file defines one function and exports an `ID` constant; `functions/index.ts` registers them.

---

## Adding a new function

1. **Add the id to `types.ts`**  
   - Add a constant, e.g. `DYNAMIC_OPTIONS_MY_OPTIONS = 'my_options'`.  
   - Append it to `KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS` so validation and types stay in sync.

2. **Create `functions/my-options.ts`**  
   - Implement the function and export an `ID` and the handler:

```ts
import type { DynamicOptionsContext, DynamicOption } from '../types'

export const ID = 'my_options'

export function myOptions(context: DynamicOptionsContext): DynamicOption[] {
  const { grids, fields } = context
  // build options from context
  return [
    { value: 'a', label: 'Option A', id: 'a' },
    { value: 'b', label: 'Option B', id: 'b' },
  ]
}
```

3. **Register in `functions/index.ts`**  
   - Import the new function and its `ID`, then register:

```ts
import { ID as MY_OPTIONS_ID, myOptions } from './my-options'
// in registerBuiltInDynamicOptions():
registerDynamicOptionsFunction(MY_OPTIONS_ID, myOptions)
```

4. **Use the id on a field**  
   - In tracker config (or in code that builds fields), set:

```ts
config: { dynamicOptionsFunction: 'my_options' }
```

No changes are required in `registry.ts` or `resolve-options.ts`; they already resolve by id.

---

## API (public)

Import from `@/lib/dynamic-options`:

| Export | Description |
|--------|-------------|
| `getDynamicOptions(functionId, context)` | Resolve options for a given function id. Returns `DynamicOption[]` (or `[]` if unknown). |
| `registerDynamicOptionsFunction(id, fn)` | Register a function for an id. Overwrites if id already exists. |
| `getRegisteredDynamicOptionsIds()` | All currently registered ids (e.g. for validation or tooling). |
| `DynamicOptionsContext` | `{ grids, fields, layoutNodes?, sections? }`. |
| `DynamicOption` | `{ label, value, id? }` (+ index signature). |
| `DynamicOptionsFn` | `(context: DynamicOptionsContext) => DynamicOption[]`. |
| `KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS` | Readonly array of built-in ids. |
| `DYNAMIC_OPTIONS_ALL_FIELD_PATHS` etc. | String constants for each built-in id. |

---

## Built-in functions

| Id | File | Description |
|----|------|-------------|
| `all_field_paths` | `all-field-paths.ts` | Options for every (grid, field) in layout: value `gridId.fieldId`, label `"Grid name → Field label"`. Respects `layoutNodes` and excludes shared-tab sections when `sections` is provided. |
| `all_operators` | `all-operators.ts` | Operator options (e.g. for depends-on rules): eq, neq, gt, gte, lt, lte, in, not_in, contains, not_contains, is_empty, not_empty, starts_with, ends_with. |
| `all_actions` | `all-actions.ts` | Action options: isHidden, isRequired, isDisabled. |
| `all_rule_set_values` | `all-rule-set-values.ts` | Boolean-like options: True / False. |

Each built-in is independent: its options and logic live only in its own file and in the registry.
