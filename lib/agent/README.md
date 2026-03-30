# Multi-Agent Tracker Builder

The tracker generation system uses a two-phase agent pipeline: a **Manager** that plans, and a **Builder** that implements. Both phases stream to the frontend via NDJSON.

---

## Architecture

```
POST /api/agent/build-tracker
  │
  ├─ 1. Auth + validate (reuse from /api/generate-tracker/lib/)
  │
  ├─ 2. Manager Agent  ──── streamObject(managerSchema)
  │       Streams: thinking → prd → builderTodo
  │       Events:  manager_partial* → manager_complete
  │
  └─ 3. Builder Agent  ──── streamObject(builderOutputSchema)
          Streams: tabs → sections → grids → fields → bindings → ...
          Events:  builder_partial* → builder_finish
```

The orchestrator in `app/api/agent/build-tracker/lib/orchestrate.ts` runs these phases sequentially: the Builder receives the Manager's complete `ManagerSchema` as part of its prompt, so it knows exactly what to build.

---

## NDJSON Event Protocol

All events are sent as one JSON object per line (`\n`-delimited). The `t` field is the discriminator.

| Event | Direction | Description |
|---|---|---|
| `phase` | server→client | Phase transition: `'manager'` or `'builder'` |
| `manager_partial` | server→client | Streaming chunk of the manager's output (thinking/prd/builderTodo) |
| `manager_complete` | server→client | Full `ManagerSchema` — emitted after the manager stream finishes |
| `builder_partial` | server→client | Streaming snapshot of the builder's schema (not a delta — always a full snapshot so far) |
| `builder_finish` | server→client | Final `BuilderOutput` — emitted after the builder stream finishes |
| `error` | server→client | Fatal error; the stream closes after this |

Types are defined in `lib/agent/events.ts` and shared between backend and frontend.

---

## Module Structure

```
lib/agent/
  events.ts          — AgentStreamEvent union + encodeEvent/decodeEvent
  stream-reader.ts   — readAgentStream(): async generator over a ReadableStream
  builder-schema.ts  — builderOutputSchema (Zod) + BuilderOutput type

app/api/agent/build-tracker/
  route.ts           — POST handler: auth, validate, stream response
  lib/
    orchestrate.ts   — orchestrateBuildTracker(): runs Manager then Builder
    manager-agent.ts — runManagerAgent(): streamObject → manager_partial* → manager_complete
    builder-agent.ts — runBuilderAgent(): streamObject → builder_partial* → builder_finish
    prompts.ts       — system prompts + user prompt assembly for both agents
    constants.ts     — token budgets, fallback limits
    (validation/context re-exported from /api/generate-tracker/lib/)

app/tracker/hooks/
  useAgentStream.ts  — React hook: reads NDJSON, accumulates state, derives statusMessage
  useTrackerChat.ts  — Consumes useAgentStream; all post-processing unchanged
```

---

## Status Messages

`useAgentStream` exposes a `statusMessage: string` that describes what the agent is currently generating. It is derived from the content of in-flight partials — no extra events needed.

**Manager phase** (derived from `manager_partial` content):
- `"Analyzing your request..."` — nothing in the partial yet
- `"Thinking through requirements..."` — `thinking` field is being generated
- `"Drafting tracker plan..."` — `prd` field is populating
- `"Finalizing build tasks..."` — `builderTodo` is populating

**Builder phase** (derived from `builder_partial` content, ordered by typical generation sequence):
- `"Generating schema..."` → `"Setting up tabs..."` → `"Building sections..."` → `"Creating grids..."` → `"Defining fields (N)..."` → `"Arranging layout..."` → `"Wiring data bindings..."` → `"Setting up calculations..."` → `"Adding validation rules..."` → `"Configuring field rules..."`

This is surfaced through `useTrackerChat` as `statusMessage` and can be rendered anywhere in the UI.

---

## Fallback Strategy

Both agents have layered fallbacks to maximise reliability:

**Manager:**
1. `streamObject` with DeepSeek (primary — streams `manager_partial` events)
2. `generateObject` with default provider (no partial events, but robust)
3. `generateObject` with a minimal stripped prompt (last resort)

**Builder:**
1. `streamObject` with DeepSeek (primary — streams `builder_partial` events)
2. `generateObject` × `MAX_FALLBACK_ATTEMPTS` with progressively simpler prompts

---

## Extending the Pipeline

To add a new agent phase (e.g. a **Validator** that checks the built schema):

1. Add new event types to `lib/agent/events.ts`:
   ```typescript
   | { t: 'validator_partial'; partial: Partial<ValidatorOutput> }
   | { t: 'validator_finish'; output: ValidatorOutput }
   ```

2. Create `app/api/agent/build-tracker/lib/validator-agent.ts` following the same pattern as `builder-agent.ts`.

3. Add the phase to `orchestrate.ts` after `runBuilderAgent`.

4. Handle the new events in `useAgentStream.ts` and extend `deriveBuilderStatus` (or add a new deriver).

The `AgentPhase` type in `lib/agent/events.ts` and `useAgentStream.ts` will need to include the new phase name.

---

## LLM Usage Tracking

Both agents report token usage via callbacks threaded from the route handler:

```
route.ts → orchestrate.ts → manager-agent.ts → onManagerLlmUsage → scheduleRecordLlmUsage(source: 'agent-manager')
                           → builder-agent.ts → onBuilderLlmUsage → scheduleRecordLlmUsage(source: 'agent-builder')
```

---

## Backward Compatibility

The old `/api/generate-tracker` endpoint is kept unchanged. Switching back is a one-line change in `useTrackerChat.ts`.
