# Generate Tracker API

## What is it?

`/api/generate-tracker` is a **POST** endpoint that turns natural language into a **tracker schema** for Trckr. Given a user’s query (and optional chat history and current tracker state), it uses an LLM (DeepSeek) to produce:

1. **Manager output** – thinking, PRD, and a builder todo list.
2. **Tracker output** – either a full `tracker` schema (first-time) or a `trackerPatch` (incremental changes).

The client can stream the response for better UX; if streaming fails, the API falls back to non-streaming generation with simpler prompts.

---

## How does it work?

### Request

- **Body (JSON):**
  - `query` (required) – string; the user’s request (e.g. “Make a task tracker with priority and due date”).
  - `messages` (optional) – array of chat messages (user/assistant) for conversation context.
  - `currentTracker` (optional) – current tracker state; when present, the model is asked to output **trackerPatch** instead of a full **tracker**.

### Flow

1. **Validate** – Parse body, require `query`, check `DEEPSEEK_API_KEY`.
2. **Context** – From `messages`, build a short conversation summary (last N user/assistant pairs). From `currentTracker`, build a “Current Tracker State (JSON)” block.
3. **Prompts** – Combine the Manager + Builder system prompt; build the main user prompt from `query`, state block, and conversation context.
4. **Generate** – Call the LLM (streaming first). If that fails, retry up to 3 times with progressively simpler fallback prompts and `generateObject`.
5. **Respond** – Return a stream (or a single-chunk stream from the fallback object) with the JSON; or 4xx/5xx with an error message.

### Folder layout

```
app/api/generate-tracker/
├── route.ts          # POST handler: parse → context → generate → response
├── README.md         # This file
└── lib/
    ├── constants.ts  # Token limits, fallback count, context window size
    ├── validation.ts # parseRequestBody(), getErrorMessage()
    ├── context.ts    # buildConversationContext(), buildCurrentStateBlock(), normalizeTrackerState()
    ├── prompts.ts    # getCombinedSystemPrompt(), buildUserPrompt(), buildFallbackPrompts()
    └── generate.ts   # generateTrackerResponse() — stream + fallback
```

### Module roles

| Module        | Role |
|---------------|------|
| `constants`   | Central place for `DEEPSEEK_CHAT_MAX_OUTPUT`, `getMaxOutputTokens()`, `MAX_FALLBACK_ATTEMPTS`, `MAX_CONTEXT_MESSAGES_PER_ROLE`. |
| `validation`  | Parse and validate POST body; normalize errors for responses. |
| `context`     | Turn `messages` and `currentTracker` into text blocks for the prompt (conversation summary + current state JSON). |
| `prompts`     | Assemble system prompt (Manager + Builder + rules) and user prompt; build the 3 fallback user prompts. |
| `generate`    | Run `streamObject`; on failure, run `generateObject` with fallback prompts and return a `Response`. |

---

## How to modify

### Change token limits or retries

- **File:** `lib/constants.ts`
- **What:** `DEEPSEEK_CHAT_MAX_OUTPUT`, `getMaxOutputTokens()` (including `DEEPSEEK_MAX_OUTPUT_TOKENS` env), `MAX_FALLBACK_ATTEMPTS`, `MAX_CONTEXT_MESSAGES_PER_ROLE`.

### Change request shape or validation

- **File:** `lib/validation.ts`
- **What:** `parseRequestBody()` — add/remove body fields, change error messages or status codes. Use `getErrorMessage()` for consistent error strings.

### Change what goes into the prompt (context)

- **File:** `lib/context.ts`
- **What:** `buildConversationContext()` (how many messages, format), `buildCurrentStateBlock()` (which parts of `currentTracker` are included), `normalizeTrackerState()` (shape of the “Current Tracker State” JSON).

### Change system or user prompts

- **File:** `lib/prompts.ts`
- **What:** `getCombinedSystemPrompt()` (Manager + Builder + output rules), `buildUserPrompt()`, `buildFallbackPrompts()`.
- **Base prompts:** Manager and Builder text live in `@/lib/prompts/manager` and `@/lib/prompts/trackerBuilder`; change those to alter high-level behavior.

### Change model or generation behavior

- **File:** `lib/generate.ts`
- **What:** Model (e.g. `deepseek('deepseek-chat')`), `streamObject`/`generateObject` options, number of fallbacks (must match length of fallback prompts from `lib/prompts.ts`), `onFinish` logging. Schema is from `@/lib/schemas/multi-agent`.

### Change HTTP behavior or error handling

- **File:** `route.ts`
- **What:** How the parsed body is passed into context/prompts, how `generateTrackerResponse()` errors are turned into status codes and JSON bodies.

---

## Environment

- **`DEEPSEEK_API_KEY`** (required) – Used for the DeepSeek model. If missing, the API returns 500.
- **`DEEPSEEK_MAX_OUTPUT_TOKENS`** (optional) – Override max output tokens; clamped between 1024 and the model’s max (~8K).

---

## Response

- **Success:** `Content-Type: text/plain; charset=utf-8` — streamed or single-chunk JSON with `manager` and either `tracker` or `trackerPatch`.
- **Error:** `application/json` with `{ "error": "..." }` and status 400 (validation) or 500 (config or generation failure).
