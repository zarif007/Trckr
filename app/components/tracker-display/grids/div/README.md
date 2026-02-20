# Div grid (form view)

Single-row form layout for tracker data. Displays one field per row by default, using `@/components/ui` components for consistent styling.

## What it is

- **Component**: `TrackerDivGrid` — form-style grid for tracker sections
- **Layout**: Packed rows with up to 12 fields per row; drag left/right to join a row
- **Uses**: Input, Textarea, Checkbox, Calendar, Popover, SearchableSelect, MultiSelect from `@/components/ui`
- **Shared**: `EntryFormDialog` from `./data-table` for Add option; `FieldMetadata` / `OptionsGridFieldDef` from `./data-table/utils`

## Files

| File | Role |
|------|------|
| `TrackerDivGrid.tsx` | Main form grid UI, field rendering, edit-mode reorder |
| `index.ts` | Re-exports |

## Dependencies

- `@/components/ui` (input, textarea, checkbox, calendar, popover, select, multi-select)
- `./data-table/entry-form-dialog` (Add option)
- `./data-table/utils` (types, field metadata)
