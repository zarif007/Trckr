# Feature Catalog

This catalog is used for onboarding and docs coverage checks. Every path below must exist.

| Feature | Primary Paths | Notes |
|---|---|---|
| Landing + marketing | `app/page.tsx`, `app/components/landing-page` | Public homepage sections. |
| Auth + session | `auth.ts`, `app/login`, `app/api/auth`, `middleware.ts` | Login and route protection. |
| Dashboard workspace | `app/dashboard`, `app/api/projects` | Project/folder and tracker listing UX. |
| Tracker route orchestration | `app/tracker`, `app/tracker/hooks` | Chat + schema orchestration logic. |
| Tracker renderer/editor | `app/components/tracker-display` | Tabs/sections/grids/edit mode. |
| Tracker page UI shell | `app/components/tracker-page` | Input, message list, empty state. |
| Tracker persistence APIs | `app/api/trackers`, `app/api/conversations` | Schema/data/conversation endpoints. |
| Dynamic options engine | `lib/dynamic-options` | Built-ins + graph/user function execution. |
| Binding + path resolution | `lib/binding`, `lib/resolve-bindings` | Select options and mapping propagation. |
| Field rules and validation | `lib/field-rules`, `lib/validate-tracker`, `lib/field-validation`, `lib/field-calculation` | Runtime field behavior and schema validation. |
| Team context and sharing | `lib/teams`, `lib/teams/service.ts`, `app/components/teams`, `app/api/teams` | Team selector and current mock API behind service interface. |
| Tracker data services | `lib/tracker-data` | Data snapshot CRUD services. |
| Database schema | `prisma/schema.prisma`, `prisma/migrations` | Source of DB truth. |
