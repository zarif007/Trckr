# Teams API

Stub for team-related HTTP API. Right now only **GET /api/teams** exists and returns **mock data**. Replace it with real auth and persistence when you implement teams.

---

## Current behavior

- **GET /api/teams** — Returns a fixed list of one mock team with one mock member. No auth; any client can call it. Used by `TeamSwitcher` to populate the team list and context.

---

## What to implement

1. **Auth**  
   Resolve the current user from session (e.g. NextAuth, Clerk). Return 401 if not authenticated.

2. **GET /api/teams**  
   - Read current user from session.  
   - Query your DB for teams where the user is a member (and optionally include membership + user details for each team).  
   - Return `TeamWithMembers[]` in the same shape as `lib/teams/types` so the UI keeps working.

3. **Other routes (when needed)**  
   - **POST /api/teams** — Create team (current user becomes admin).  
   - **GET /api/teams/[id]** — Get one team + members (if user is member).  
   - **PATCH /api/teams/[id]** — Update team (admin only).  
   - **POST /api/teams/[id]/invite** — Invite by email + role (admin only); create pending membership, optionally send email.  
   - **DELETE /api/teams/[id]/members/[userId]** — Remove member or cancel invite (admin only).  
   - **PATCH /api/teams/[id]/members/[userId]** — Change role (admin only).  
   - **POST /api/teams/invites/[token]/accept** — Accept invite (set session, redirect).

Keep response shapes aligned with `lib/teams/types` (`Team`, `TeamWithMembers`, etc.) so the frontend does not need changes.
