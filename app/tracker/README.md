# Tracker route (`/tracker`)

The main tracker-builder page: chat UI + streaming tracker generation. **Page logic and hooks** live here; **page UI components** live in `@/app/components/tracker-page/`.

## Structure

| Path | Responsibility |
|------|-----------------|
| **page.tsx** | Route entry; composes `useTrackerChat` and components from `@/app/components/tracker-page`. |
| **hooks/useTrackerChat.ts** | Chat state, submit, streaming, tracker data, dialog state. Exports types (`Message`, `TrackerResponse`) and constants (`suggestions`, `quickSuggestions`) used by tracker-page components. |
| **utils/** | Tracker merge/transform utilities. |

## Where the UI lives

- **TrackerEmptyState**, **TrackerInputArea**, **TrackerMessageList**, **TrackerDialog** → `app/components/tracker-page/` (see that folder’s README).
- **TrackerDisplay** (schema/tabs/grids) → `app/components/tracker-display/`.

This keeps the route thin (state + composition) and all reusable UI under `app/components/` by feature.
