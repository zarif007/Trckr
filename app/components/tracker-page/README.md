# Tracker page components

UI components used **only by the `/tracker` route** (the main chat + tracker builder experience). They are feature-specific to this page and are composed with shared UI (`@/components/ui`) and the tracker-display feature (`@/app/components/tracker-display`).

## Role

- **TrackerEmptyState**: First-time empty state with suggestions and hero input.
- **TrackerInputArea**: Text input + quick suggestions; used in empty state and as fixed bottom bar when chat has messages.
- **TrackerMessageList**: Renders chat messages (user/assistant), manager insights, and tracker preview cards; handles loading/streaming UI.
- **TrackerDialog**: Modal that shows `TrackerDisplay` (streaming or final tracker), validation errors, and error/retry states.

## Data flow

- State and handlers live in **`app/tracker/hooks/useTrackerChat`**; the page passes them as props.
- These components do **not** own API or chat state; they are presentational and callback-driven.
- `TrackerDialog` uses **`TrackerDisplay`** from `@/app/components/tracker-display` to render the actual tracker schema and grids.

## Imports

- From **page**: `import { ... } from '@/app/components/tracker-page/...'`
- **Tracker types/hooks**: `@/app/tracker/hooks/useTrackerChat` (Message, TrackerResponse, suggestions, quickSuggestions).

## File layout

```
tracker-page/
  README.md
  TrackerEmptyState.tsx
  TrackerInputArea.tsx
  TrackerMessageList.tsx
  TrackerDialog.tsx
```
