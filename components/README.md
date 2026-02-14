# Components (shared UI)

This folder holds **shared, reusable UI primitives** used across the app. They are **presentation-only** and have no knowledge of routes or app-specific features.

## Role

- **Design system / UI library**: Buttons, inputs, dialogs, tables, selects, etc.
- **Import path**: Use `@/components/...` from anywhere (e.g. `@/components/ui/button`).
- **Do not put here**: Feature-specific logic, tracker types, or page-specific layouts.

## Structure

```
components/
  ui/                    # Primitive components (shadcn-style)
    badge.tsx
    button.tsx
    calendar.tsx
    card.tsx
    checkbox.tsx
    command.tsx
    dialog.tsx
    input.tsx
    multi-select.tsx
    popover.tsx
    select.tsx
    table.tsx
    tabs.tsx
    textarea.tsx
    ...
  README.md              # This file
```

## Note on grids

The **table** and **kanban** grid implementations used by the tracker live under **`app/components/tracker-display/grids/`** (data-table + kanban).

## Adding new primitives

- Add new components under `components/ui/`.
- Keep them generic (no imports from `app/` or tracker types unless necessary for a shared prop type).
- Re-export from `components/ui` if you want a single entry point.
