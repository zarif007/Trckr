# Teams module (core)

Shared types, permissions, context, and constants for **team workspaces** in Trckr. This folder is the single source of truth for team-related data shapes and permission logic. UI and API live elsewhere and depend on this module.

---

## What it is

- **Teams** = workspaces (e.g. "Acme Team") that users can join. Each team has members with roles (admin, editor, viewer).
- **Tracker ownership** = a tracker can be personal (owned by a user) or shared with a team. Who can add/edit/delete rows is determined by **role** and **grid config** together.
- This module does **not** implement auth, persistence, or API—it defines types and runtime helpers so the rest of the app can be built on a clear contract.

---

## What it does

| File | Purpose |
|------|--------|
| **types.ts** | `User`, `Team`, `Membership`, `TeamRole`, `TrackerMeta`, `TeamWithMembers`. Use these everywhere team data is passed or stored. |
| **constants.ts** | `ROLE_LABELS`, `TEAM_ROLES`—shared labels and role order for UI (dropdowns, member lists). |
| **permissions.ts** | `getEffectiveGridPermissions(role, gridConfig)` → `{ addable, editable, deletable, editLayoutAble }`. Viewer → all false; editor/admin → follow grid config. Use when rendering table/kanban/div so read-only is consistent. |
| **context.tsx** | `TeamProvider`, `useTeamContext`, `useTeamContextOrThrow`. Holds `currentUser`, `currentTeam`, `teams`, and `getRoleForTeam(teamId)`. Wired in root layout; UI and permission logic read from here. |

---

## How it works

1. **Provider**  
   Root layout wraps the app in `TeamProvider`. No auth yet—`currentUser` is null until you wire login; `teams` are loaded by the Team Switcher from `GET /api/teams`.

2. **Switcher**  
   User picks "Personal" or a team. That sets `currentTeam`. Tracker list (when implemented) can filter by `currentTeam` and show "My trackers" vs "Team: X".

3. **Permissions**  
   For a given tracker shared with a team, resolve the current user’s role (e.g. via `getRoleForTeam(teamId)` or from tracker meta). Call `getEffectiveGridPermissions(role, grid.config)`. Pass the result into the grid (addable, editable, deletable, editLayoutAble) so viewer is read-only and editor/admin respect schema config.

4. **Tracker meta**  
   Ownership and sharing are **not** in the tracker schema (tabs/grids/fields). They live in a separate `TrackerMeta` (or DB table): `ownerId`, `teamId`, `teamDefaultRole`. When you add persistence, store and load this next to the tracker document.

---

## What has been done

- [x] **Types** — `User`, `Team`, `Membership`, `TeamRole`, `TrackerMeta`, `TeamWithMembers`.
- [x] **Constants** — `ROLE_LABELS`, `TEAM_ROLES` for consistent UI.
- [x] **Permissions** — `getEffectiveGridPermissions(role, config)` implemented and used by the permission layer (grid config already supports add/edit/delete flags).
- [x] **Context** — `TeamProvider` in root layout; `currentUser`, `currentTeam`, `teams`, `setCurrentTeam`, `setTeams`, `getRoleForTeam`.
- [x] **UI shell** — Team Switcher, Members dialog, Share Tracker dialog (see `app/components/teams/README.md`). They use mock/context data only.
- [x] **API stub** — `GET /api/teams` returns mock teams (see `app/api/teams/README.md`).

---

## What is needed to implement teams fully

Use this as a checklist when you start implementation.

### 1. Auth and current user

- [ ] Choose auth (e.g. NextAuth, Clerk) and add sign-in/sign-up.
- [ ] After login, set `currentUser` in team context (or derive it from session in a wrapper that reads session and calls `setCurrentUser`).
- [ ] Ensure `GET /api/teams` (and other team APIs) resolve the current user from session and return only that user’s teams.

### 2. Persistence and APIs

- [ ] **Teams and members** — DB tables (or equivalent) for teams, memberships, and pending invites. APIs: list teams, get team, create team, update team, list members, invite by email, change role, remove member, accept/decline invite.
- [ ] **Tracker meta** — Store `TrackerMeta` (or equivalent) per tracker: `trackerId`, `ownerId`, `teamId?`, `teamDefaultRole?`. APIs: get meta for tracker, share tracker (set teamId + role), unshare.
- [ ] **Tracker list** — When you have a “tracker list” page or home: load trackers for current user (personal) and for `currentTeam` if set; filter by `teamId` and ownership using tracker meta.

### 3. Permission wiring

- [ ] When loading a tracker, load its meta and resolve current user’s role (owner vs team member with role from membership).
- [ ] Call `getEffectiveGridPermissions(role, grid.config)` per view/grid and pass the result into the grid components (they already accept addable/editable/deletable/editLayoutAble).
- [ ] Restrict schema edit (edit mode) to owner or team admin/editor; hide or disable for viewer.

### 4. UI completion

- [ ] **Invite flow** — Connect “Invite” in Members dialog to an API that creates a pending invite and sends email (or magic link).
- [ ] **Share flow** — Connect Share dialog’s `onShare(teamId, defaultRole)` to an API that saves tracker meta (teamId, teamDefaultRole).
- [ ] **Tracker list** — “My trackers” vs “Team: X” with empty states and “Create” / “Share” CTAs.
- [ ] **Onboarding** — Optional tooltip/modal when switching to a team for the first time.

### 5. Optional later

- [ ] Audit log (who changed what on a tracker).
- [ ] Custom roles or extra permissions.
- [ ] Team-level settings (default role for new invites, etc.).

---

## Import guide

```ts
// Types and constants
import type { Team, TeamRole, TrackerMeta, User } from '@/lib/teams'
import { ROLE_LABELS, TEAM_ROLES } from '@/lib/teams'

// Context (inside TeamProvider)
import { useTeamContext, useTeamContextOrThrow } from '@/lib/teams'

// Permissions (use when resolving role for a tracker)
import { getEffectiveGridPermissions } from '@/lib/teams'
```

---

## Where the rest lives

- **UI components** — `app/components/teams/` (TeamSwitcher, TeamMembersDialog, ShareTrackerDialog). See that folder’s README.
- **API** — `app/api/teams/` (stub GET). See that folder’s README for what to replace.
- **Provider** — Wired in `app/layout.tsx`; Team Switcher and Share/Members UI are used in `app/components/TrackerNavBar.tsx` and tracker page.
