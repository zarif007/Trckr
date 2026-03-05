# lib/auth/server

Server-side authentication guards for API handlers.

## Why this module exists

Routes previously repeated `auth()` + `session?.user?.id` checks. This module centralizes that logic to:

- reduce duplication,
- keep unauthorized responses consistent,
- provide a typed authenticated user object to downstream services.

## Main export

- `requireAuthenticatedUser()`
  - returns `{ ok: true, user }` when authenticated
  - returns `{ ok: false, response }` for unauthorized requests
- `isAuthenticatedRequest(req)`
  - lightweight cookie presence check for middleware edge runtime

## Contract

- External API behavior is unchanged: unauthorized requests still return `401` with `{ error: "Unauthorized" }`.
