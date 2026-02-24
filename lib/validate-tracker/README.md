# validate-tracker

Technical documentation for the tracker schema validation and auto-fix module.

## What it is

`validate-tracker` checks **tracker schema integrity**: that layout, bindings, and dependency rules are consistent and reference real entities. It does **not** validate business rules or runtime data—only the structure of the tracker config (tabs, sections, grids, fields, layoutNodes, bindings, dependsOn).

- **Errors** = structural problems (e.g. layoutNode pointing to a missing grid). `valid: false` when any error exists.
- **Warnings** = things that will be skipped or degraded at runtime (e.g. options field with no binding, invalid dependsOn source). The tracker can still be considered “valid” for schema purposes.

It also provides **auto-fix**: creating missing bindings and Shared-tab infrastructure for options/multiselect fields so schemas can be repaired instead of only reported.

## How it works

### Flow

1. **Entry:** `validateTracker(tracker)` is the main API.
2. **Context:** The tracker is normalized into a **validation context**: id sets (`tabIds`, `sectionIds`, `gridIds`, `fieldIds`) and the same arrays (tabs, sections, grids, fields, layoutNodes, bindings). This is built once and passed to every validator.
3. **Validators:** A fixed list of validator functions runs, each receiving the same context (and the raw tracker when needed, e.g. for `dependsOn`). Each returns `{ errors?: string[], warnings?: string[] }`.
4. **Merge:** All errors and warnings are merged. `valid` is `true` only when there are zero errors (warnings do not affect `valid`).

So: one context build → N validators → one merged result.

### Context

`buildValidationContext(tracker)` in `context.ts`:

- Fills missing `tabs`/`sections`/`grids`/`fields`/`layoutNodes`/`bindings` with `[]` or `{}`.
- Builds `Set`s for each id collection for O(1) lookups.
- Exposes both the sets and the arrays so validators can iterate and look up as needed.

Validators are pure with respect to the context: they read only and do not mutate it.

### Validators

| Validator | File | Severity | What it checks |
|-----------|------|----------|----------------|
| **Layout** | `validators/layout.ts` | Errors | layoutNodes reference existing gridIds and fieldIds; sections reference existing tabIds; grids reference existing sectionIds. |
| **Options fields** | `validators/options-fields.ts` | Warnings | Every `options` / `multiselect` field (that is placed in a grid) has a bindings entry. |
| **DependsOn** | `validators/depends-on.ts` | Warnings | Each `dependsOn` rule has a valid `source` (grid + field) and each target path has valid grid + field. |
| **Bindings** | `validators/bindings.ts` | Warnings | Binding keys are valid grid.field paths; optionsGrid exists and is an options grid; labelField and fieldMappings reference existing fields; value mapping (to = field path) exists; dynamic_select/dynamic_multiselect use known function ids; select/multiselect fields in layout have a bindings entry. |
| **Validations** | `validators/validations.ts` | Errors | Validation keys must be `"gridId.fieldId"` (like bindings, e.g. `main_grid.sku`). Every field is in a grid; there is no bare `fieldId` key. Expr rules must reference fields by `gridId.fieldId`. |
| **Calculations** | `validators/calculations.ts` | Errors | Calculation keys must be `"gridId.fieldId"` target paths. Rules must have `{ expr }`; expression field references must be valid, in the same grid as target, and calculation dependencies must not form cycles. |

Layout, validations, and calculations produce **errors**; the rest produce **warnings** so that invalid bits are skipped at runtime without failing the whole schema.

### Auto-fix

`autoFixBindings(tracker)` in `auto-fix.ts`:

- Does **not** mutate the input; returns a new tracker (same type `T`).
- For each `options` / `multiselect` field that has no bindings entry and is placed in a grid:
  - Ensures a **Shared** tab and **Option Lists** section exist.
  - Creates an options grid `{fieldId}_options_grid` and a single option field (display = value).
  - Adds a layoutNode for that field in the options grid.
  - Adds a bindings entry: `optionsGrid`, `labelField`, and a single fieldMapping from the option field to the select field.

So after auto-fix, every such field has a minimal but valid binding. Other validators (e.g. layout, dependsOn) are unchanged by auto-fix.

## API

Import from `@/lib/validate-tracker`:

- **`validateTracker(tracker)`** → `ValidationResult`  
  `{ valid, errors, warnings }`. Use this for one-shot validation.

- **`validateBindings(tracker)`** → `string[]`  
  Binding-specific warnings only. Useful when you only care about bindings.

- **`validateDependsOn(tracker)`** → `string[]`  
  dependsOn-specific warnings only.

- **`autoFixBindings(tracker)`** → `tracker` (same type)  
  Returns a new tracker with missing bindings and Shared infrastructure added.

- **Types:** `TrackerLike`, `ValidationResult`, `BindingEntry` are exported.

## Module layout

```
validate-tracker/
├── README.md           # This file
├── index.ts            # Public API: validateTracker, re-exports, result merge
├── types.ts            # TrackerLike, ValidationResult, BindingEntry, ValidationContext, ValidatorResult
├── context.ts          # buildValidationContext(tracker)
├── utils.ts            # titleCase (used by auto-fix)
├── auto-fix.ts         # autoFixBindings(tracker)
└── validators/
    ├── index.ts        # Re-exports all validators
    ├── layout.ts       # Layout/section/grid reference checks
    ├── options-fields.ts
    ├── depends-on.ts
    ├── bindings.ts
    ├── validations.ts
    └── calculations.ts
```

Adding a new check: implement a function `(ctx: ValidationContext) => ValidatorResult` (and `tracker` if needed), export it from `validators/index.ts`, and add it to the list in `index.ts` inside `validateTracker`.

## Dependencies

- **`@/lib/resolve-bindings`** — `parsePath()` for grid.field paths and legacy tab.grid.field.
- **`@/lib/dynamic-options`** — `KNOWN_DYNAMIC_OPTIONS_FUNCTION_IDS` for validating dynamic select/multiselect config.

## When to use

- **Before save / publish:** Run `validateTracker(tracker)` and surface `errors` (and optionally `warnings`) in the UI or API.
- **After schema load or migration:** Optionally run `autoFixBindings(tracker)` to backfill missing bindings, then validate.
- **Debugging:** Use `validateBindings` or `validateDependsOn` when you only care about one area.

Validation is designed to run in the same process as the app (e.g. in a hook or before persisting); it does not call external services.
