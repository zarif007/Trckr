# CLAI (CLI + Agent)

CLAI is a CLI-style assistant panel on the dashboard: a movable, resizable floating window that looks like a terminal but stays approachable for non-technical users. It is designed for future integration with an agent and custom commands.

## What CLAI is

- **Floating window**: Draggable by the **tab bar** (no separate title bar) and resizable (right, bottom, corner). Rendered in a portal so it overlays the dashboard without being clipped by the main layout.
- **Multi-instance tabs**: Multiple sessions (tabs); each tab has its own output history. Add tab via "+", close via tab close icon. Tab labels show location (path relative to dashboard). Window close button on the right of the tab bar.
- **Warp-style CLI**: Dark theme (zinc-950/900), monospace, prompt shows **location relative to dashboard** (e.g. `~` or `~/dashboard/projects`). Scrollable output and single input row. Output lines are typed (`text`, `command`, `error`, `system`) for consistent styling.
- **Location**: The active tab’s prompt displays the current route as a **human-readable path** (e.g. `~` for dashboard root, `~/dashboard/My Project/module/My Module`). Path segments are resolved to **names from the DB** via the dashboard context (`projects` with nested modules and project files). The terminal uses this resolved path once dashboard data is available; IDs are shown only when a name is not yet loaded.

## Component map

| Component        | Responsibility                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ClaiProvider** | React context: `open`, `setOpen`. Holds **instances** (tabs) each with `id`, `lines`, `location`; `activeId`; pathname → location; optional localStorage for position/size. Renders FAB and CLAI window via portal. |
| **ClaiWindow**   | Movable/resizable shell (react-rnd): **tab bar** as drag handle (tabs, "+", window close), no title bar. Contains ClaiPanel for the active instance.                                                                |
| **ClaiPanel**    | Inner CLI (Warp-style): scrollable output, fixed input row with **location prompt** (e.g. `~ ›`). Accepts `lines`, `location`, and `onSubmit`.                                                                      |

Data flow: Provider owns `instances` and per-tab `onSubmit`; pathname drives current location for the active tab. Submit appends a command line and (placeholder) reply. Later, `onSubmit` can dispatch to a command registry or agent API.

## Adding a new output type

1. **Extend the line type** in `types.ts`:
   - Add a new variant to the `ClaiLineType` union (e.g. `'agent'`).
   - Ensure `ClaiLine` and `ClaiLineTypeMap` stay in sync.

2. **Render the new type** in `ClaiPanel.tsx`:
   - In `LineContent`, add a `case` for the new type and return the appropriate JSX (e.g. markdown, rich block, or custom component).

3. **Emit the new type** where you produce lines (e.g. in `ClaiProvider.handleSubmit` or a future command/agent layer): push objects with `type: 'agent'` (and your payload) into the lines array.

## Adding a command

- **Where to register**: Commands can be handled in the provider (e.g. in `handleSubmit`) or in a dedicated hook (e.g. `useClaiCommands`) that you call from the provider. For a simple map of command name → handler, keep it in the provider or a small `commands.ts` that the provider imports.

- **Flow**: On submit, parse the input (e.g. strip leading `/` or split on space). If it matches a known command, call the handler; the handler can push one or more lines (e.g. `system`, `text`, `error`) to the lines state. If no command matches, pass the input to the agent (see below).

## Where the agent plugs in

- **Entry point**: In `ClaiProvider`, `handleSubmit` currently appends a command line and a placeholder reply. To plug in an agent:
  - Option A: From `handleSubmit`, call an async function (e.g. `agent.respond(value)`) and push agent output as new lines (e.g. type `'text'` or a dedicated `'agent'` type) as the response streams or completes.
  - Option B: Route non-command input to the agent and command input to the command registry; push both command results and agent responses as lines.

- **State**: Keep line history in the provider (as now). For streaming, you can push a single "agent" line and update its `content` (or a dedicated field) until the stream ends.

## Files

- `types.ts` – `ClaiLine`, `ClaiLineType`, `ClaiLineTypeMap`, `ClaiInstance` (tab/session).
- `ClaiPanel.tsx` – Output area + input row with location prompt; `LineContent` by line type; Warp-like dark theme.
- `ClaiWindow.tsx` – Rnd wrapper, tab bar (drag handle), no title bar; hosts ClaiPanel for active instance.
- `ClaiProvider.tsx` – Context, FAB, portal, instances + activeId, pathname + `projects` (useDashboard) → resolved location, position/size persistence, `onSubmit` per instance.
- `resolveDashboardPath.ts` – Resolves pathname to display path using project/module/file names from `projects` (IDs when name not found). Used so the terminal shows names from the DB when data is loaded.
- `index.ts` – Re-exports for clean imports.
