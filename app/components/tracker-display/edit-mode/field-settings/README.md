# Field settings

Main dialog for editing a single tracker field: display (label, placeholder, data type), validations, calculations, bindings (options → grid), field rules, and dynamic options. Used when the user clicks the field settings control in table or div grids.

## What it does

**FieldSettingsDialog** is a tabbed modal that lets you:

- **General**: Set label, placeholder, required flag, and data type; see where the field gets its data from (manual, calculation, auto-populate from bindings); set min/max or min/max length for numeric or text types.
- **Validations**: Add validation rules (required, min, max, minLength, maxLength, or custom expression). Rules are keyed by `gridId.fieldId` when the field lives in a grid.
- **Calculations**: Configure one expression that computes this field’s value (when the field is in a grid).
- **Field rules**: Define conditions on other fields that hide, require, or disable this field (when in a grid).
- **Bindings**: For `options` / `multiselect` fields, bind to an options grid and set field mappings for auto-population.
- **Dynamic**: For `dynamic_select` / `dynamic_multiselect`, configure the dynamic options function, args, and cache TTL via **DynamicOptionsBuilder**.

All changes are applied when the user clicks **Save Changes**; the dialog calls `onSchemaChange` with the updated schema (fields, validations, calculations, bindings, fieldRulesByTarget, dynamicOptions).

## How the pieces work

1. **Entry point**  
   **TrackerTableGrid** and **TrackerDivGrid** render a settings control (e.g. on column header or field row) that opens **FieldSettingsDialog** with `fieldId`, `gridId`, `schema`, and `onSchemaChange`.

2. **State and logic**  
   **useFieldSettingsState** holds all dialog state (form values, rules, binding draft, dynamic options draft, etc.), syncs from `schema` when the dialog opens or the field changes, and implements **handleSave**: it builds the next schema (updated field config, validations, calculations, bindings, fieldRulesByTarget, dynamicOptions) and calls `onSchemaChange`, then closes the dialog.

3. **UI structure**  
   **FieldSettingsDialog** calls the hook and renders:
   - A **Dialog** with header (field label + id), a **Tabs** list (General, Validations, Calculations, Field rules, Bindings, Dynamic), and a footer (Cancel / Save).
   - Each tab’s content is a separate component that receives only the state and callbacks it needs from the hook.

4. **Tab components**
   - **GeneralTab**: Display inputs, “Getting data from” badges, required checkbox, data type select, and min/max or minLength/maxLength for numeric/text types.
   - **ValidationsTab**: List of validation rules (type, value, custom expr via **ExprRuleEditor**, message), add/remove, and a collapsible “rule summary” with optional raw JSON.
   - **CalculationsTab**: Single calculation expression via **ExprRuleEditor**, or empty state to add one (only when field is in a grid).
   - **FieldRulesTab**: List of field rule conditions (source field, operator, value, action, set), add/remove (only when field is in a grid).
   - **BindingsTab**: Options grid + label field + **FieldMappingsEditor** and auto-map (only for options/multiselect).
   - Dynamic options: **DynamicOptionsBuilder** is inlined in the dialog (not a separate tab file) and receives draft state and validation callbacks from the hook.

5. **Shared constants and types**  
   **constants.ts** exports labels for field rule actions/operators, validation rule types, default expressions, type groups (numeric, text), **GROUP_ORDER** for data type select, and helpers (**toNumberOrUndefined**, **ensureRuleDefaults**, **sourceEntryId**, **sourceEntryLabel**, **FieldDataSource**).  
   **types.ts** exports **FieldSettingsDialogProps**.

## Files

| File                         | Role                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **FieldSettingsDialog.tsx**  | Dialog shell: header, tabs, footer; composes hook and tab components; inlines Dynamic options tab.         |
| **useFieldSettingsState.ts** | Hook: state, effects (sync from schema), derived data (pathLabelMap, bindingValidation, etc.), handleSave. |
| **GeneralTab.tsx**           | General tab: display, data sources, required, data type, min/max or min/max length.                        |
| **ValidationsTab.tsx**       | Validations tab: rule list, ExprRuleEditor for expr rules, rule summary + JSON.                            |
| **CalculationsTab.tsx**      | Calculations tab: single ExprRuleEditor or empty state.                                                    |
| **FieldRulesTab.tsx**        | Field rules tab: condition list (source, operator, value, action, set).                                    |
| **BindingsTab.tsx**          | Bindings tab: options grid, label field, FieldMappingsEditor, auto-map, preview.                           |
| **constants.ts**             | Labels, rule types, default exprs, type groups, pure helpers.                                              |
| **types.ts**                 | FieldSettingsDialogProps.                                                                                  |
| **index.ts**                 | Barrel: exports FieldSettingsDialog.                                                                       |

## Usage

**FieldSettingsDialog** is used by **TrackerTableGrid** and **TrackerDivGrid** and is consumed via the edit-mode barrel (`../edit-mode` or `../../edit-mode`). Pass `open`, `onOpenChange`, `fieldId`, optional `gridId`, `schema`, and `onSchemaChange`.
