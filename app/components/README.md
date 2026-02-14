# App components

Feature and layout components used by the app. Each subfolder has a **single responsibility** and can import from `@/components` (shared UI) and app/lib code.

## Role

- **Feature components**: Tracker display, tracker page UI, landing page sections.
- **Layout components**: NavBar, ThemeToggle (app shell).
- **Do not put here**: Generic UI primitives (those go in `components/` at project root).

## Structure

| Folder / file | Responsibility |
|---------------|-----------------|
| **tracker-display/** | Render tracker schema: tabs, sections, table/kanban/form views. Grid implementations live in `tracker-display/grids/` (data-table, kanban). See [tracker-display/README.md](./tracker-display/README.md). |
| **tracker-page/** | UI for the `/tracker` route: dialog, message list, input area, empty state. See [tracker-page/README.md](./tracker-page/README.md). |
| **landing-page/** | Landing page sections: Hero, Demo, Features, CTA, etc. |
| **NavBar.tsx** | Top navigation. |
| **ThemeToggle.tsx** | Theme switch. |

## Import convention

- From pages/routes: `import { X } from '@/app/components/...'`
- Within app components: use `@/app/components/...` or relative paths within the same feature folder.

## Component roots (project-wide)

1. **`components/`** (project root) — Shared UI primitives only. No app/route knowledge.
2. **`app/components/`** — All app feature and layout components (this folder). Tracker page UI lives in `tracker-page/`; route-specific components are no longer under `app/tracker/components/`.
