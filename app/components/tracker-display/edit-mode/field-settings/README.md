# Field settings

Main dialog for editing a single field: type, validations, calculations, bindings, and dynamic options. Used when the user clicks the field settings control in table or div grids.

## What it is

- **FieldSettingsDialog**: Full-screen-style dialog with tabs (Basic, Validations, Calculations, Bindings, Dynamic options). Renders **ExprRuleEditor** for custom validation/calculation expressions, **DynamicOptionsBuilder** for dynamic option pipelines, and **FieldMappingsEditor** for bindings. Reads/writes via `schema` and `onSchemaChange` from edit mode context.

## How it works

1. **TrackerTableGrid** and **TrackerDivGrid** render a settings button (e.g. on column header or field row) that opens **FieldSettingsDialog** with the current field id, grid id, schema, and onSchemaChange.
2. The dialog uses **useEditMode()** for schema/onSchemaChange when not passed explicitly. It updates the field in the schema (type, validations, calculations, bindings, dynamicOptions) and calls onSchemaChange with the new schema.
3. **Basic** tab: label, data type (with FIELD_TYPE_LABELS / getCreatableFieldTypesWithLabels from edit-mode utils). **Validations** / **Calculations** tabs use **ExprRuleEditor** (from expr/). **Bindings** tab uses **FieldMappingsEditor** and bindings-utils. **Dynamic options** tab uses **DynamicOptionsBuilder** (from dynamic-options/).

## Files

| File | Role |
|------|------|
| FieldSettingsDialog.tsx | Dialog with tabs; composes ExprRuleEditor, DynamicOptionsBuilder, FieldMappingsEditor |
| index.ts | Barrel export |

## Usage

- **FieldSettingsDialog** is used by **TrackerTableGrid** and **TrackerDivGrid**; consumed via the edit-mode barrel (`../edit-mode` or `../../edit-mode`).
