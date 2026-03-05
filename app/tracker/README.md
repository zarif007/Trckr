# Tracker route (`/tracker`)

The main tracker-builder page: chat UI + streaming tracker generation. **Page logic and hooks** live here; **page UI components** live in `@/app/components/tracker-page/`.

## Structure

| Path | Responsibility |
|------|-----------------|
| **page.tsx** | Thin route wrapper (redirect + re-export). |
| **views/TrackerAIView.tsx** | Main orchestration view for tracker editing/chat experience. |
| **views/TrackerPanel.tsx** | Preview/edit panel shell and top-right action controls. |
| **views/TrackerChatPanel.tsx** | Chat panel composition (empty state, message list, input). |
| **views/TrackerStatusPanel.tsx** | Validation/error/no-tracker state banner area. |
| **hooks/useTrackerChat.ts** | Chat generation state + streaming + persistence orchestration. |
| **hooks/conversation.ts** | Conversation and message persistence service calls. |
| **hooks/normalization.ts** | Schema normalization helpers for scaffolds and validation/calculation keys. |
| **hooks/constants.ts** | Suggestions and generation retry constants. |
| **utils/** | Tracker merge/transform utilities. |

## Where the UI lives

- **TrackerEmptyState**, **TrackerInputArea**, **TrackerMessageList**, **TrackerDialog** → `app/components/tracker-page/` (see that folder’s README).
- **TrackerDisplay** (schema/tabs/grids) → `app/components/tracker-display/`.

This keeps the route thin (state + composition) and all reusable UI under `app/components/` by feature.
