# Teams UI components

React components for **team switcher**, **members/invite**, and **share tracker**. They depend on `lib/teams` (types, context, constants) and are currently wired for **mock data** so the app runs without a backend. When you implement teams, connect them to real APIs and auth.

---

## What’s in this folder

| Component | What it does | Where it’s used |
|-----------|--------------|-----------------|
| **TeamSwitcher** | Dropdown: “Personal” + list of teams. Fetches teams from `GET /api/teams` and updates context. Selecting an option sets `currentTeam` in team context. | `TrackerNavBar` (tracker layout) |
| **TeamMembersDialog** | Modal: list members of `currentTeam` with role labels; “Invite by email” + role select. Invite button is a no-op until you add an invite API. | Opened from the Users icon in `TrackerNavBar` |
| **ShareTrackerDialog** | Modal: choose a team and default role, then call `onShare(teamId, defaultRole)`. Parent (tracker page) can persist via API. Currently logs to console. | Opened from “Share” in the tracker panel toolbar |

---

## How it works

1. **TeamProvider** (from `lib/teams`) must wrap the app—already done in `app/layout.tsx`.
2. **TeamSwitcher** on load calls `GET /api/teams`, then `setTeams(data)` on context. User choice sets `currentTeam` (or null for Personal).
3. **TeamMembersDialog** reads `currentTeam` and `teams` from context; finds the current team’s `members` from `teams` and shows them. Invite form does not call an API yet.
4. **ShareTrackerDialog** reads `teams` from context, lets user pick team + role, and calls `onShare(teamId, defaultRole)`. The tracker page passes an `onShare` that today only logs; later it should call an API to save `TrackerMeta`.

---

## What’s done

- [x] TeamSwitcher: fetch teams, display Personal + teams, update context.
- [x] TeamMembersDialog: list members with roles, invite form (UI only).
- [x] ShareTrackerDialog: team + role select, `onShare` callback.
- [x] Shared role labels/order via `lib/teams` constants (`ROLE_LABELS`, `TEAM_ROLES`).
- [x] Basic a11y (labels, keyboard-friendly).

---

## What you need to do when implementing teams

1. **Auth**  
   Once you have a session, set `currentUser` in team context (e.g. in a layout or wrapper that reads auth and calls `setCurrentUser`). TeamSwitcher and APIs should then use the real user.

2. **API /api/teams**  
   Replace the mock in `app/api/teams/route.ts` with a real implementation that returns the current user’s teams (and members) from your DB. See `app/api/teams/README.md`.

3. **Invite**  
   In `TeamMembersDialog`, on “Invite”: call an API that creates a pending invite (and optionally sends email). Refresh members or teams after success.

4. **Share**  
   In the tracker page, replace the `onShare` passed to `ShareTrackerDialog` with an API call that saves tracker meta (e.g. `POST /api/trackers/:id/share` with `teamId`, `defaultRole`).

5. **Tracker list**  
   When you add a “My trackers” / “Team trackers” list, use `currentTeam` and load trackers filtered by `ownerId` and `teamId` from tracker meta.

6. **Permissions**  
   When rendering a tracker, resolve the current user’s role (from meta + membership), then use `getEffectiveGridPermissions(role, grid.config)` from `lib/teams` and pass the result into the grid (addable, editable, deletable, editLayoutAble).

---

## Imports

Components use:

- `@/lib/teams` — `useTeamContext`, `ROLE_LABELS`, `TEAM_ROLES`
- `@/lib/teams/types` — `TeamRole`, `Team`, `TeamWithMembers`, etc.
- `@/components/ui` — Button, Dialog, Input, Popover

To use in another page:

```tsx
import { TeamSwitcher, TeamMembersDialog, ShareTrackerDialog } from '@/app/components/teams'
```
