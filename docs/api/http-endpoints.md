# HTTP Endpoints

## Auth

- `GET/POST /api/auth/[...nextauth]`
- `POST /api/auth/log-login`

## Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`

## Trackers

- `POST /api/trackers`
- `GET /api/trackers/:id`
- `PATCH /api/trackers/:id`
- `GET /api/trackers/:id/conversation`
- `POST /api/trackers/:id/conversation`
- `GET /api/trackers/:id/data`
- `POST /api/trackers/:id/data`
- `GET /api/trackers/:id/data/:dataId`
- `PATCH /api/trackers/:id/data/:dataId`
- `DELETE /api/trackers/:id/data/:dataId`

## Conversations

- `POST /api/conversations/:id/messages`

## Generation

- `POST /api/generate-tracker`
- `POST /api/agent/generate-expr`
- `POST /api/agent/generate-analysis`
- `POST /api/agent/generate-dynamic-options`
- `POST /api/dynamic-options/resolve`

## Teams

- `GET /api/teams`

## Contract Stability Rule

Current route paths and response shapes are treated as stable contracts. Any breaking change requires explicit design review and migration plan.
