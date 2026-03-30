# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering Standard

Build every piece of this project — components, functions, features, APIs — to production grade. Not MVP. Not "good enough for now."

**The bar:** Code a new engineer (or agent) can onboard into in minutes, not days. Self-explanatory names, clear boundaries, no mystery.

### Non-negotiables

- **Modular**: Every unit has one job. Extract reusable logic into `lib/`. Keep components focused on rendering/interaction only.
- **Scalable**: Design for growth. Avoid patterns that require rewriting when requirements change (e.g. hardcoded lists, prop-drilling across 3+ levels, god components).
- **Unbreakable**: Cover edge cases. Validate at system boundaries. Never silently swallow errors. Tests for any non-trivial logic.
- **Self-documenting**: Names explain intent. A function named `resolveFieldVisibility` needs no comment. Avoid abbreviations. Prefer explicit over clever.
- **Minimal comments**: Only comment *why*, never *what*. If the code needs explanation, rename or restructure first.
- **Consistent**: Follow existing patterns in the codebase before inventing new ones. New patterns belong in `lib/` with clear ownership.

### What this means in practice

- New feature? Define its module boundary before writing code.
- New component? It should be droppable into a different page without changes.
- New lib function? Export a typed interface, handle error cases, write a test.
- Refactoring? Leave the module more coherent than you found it — but only touch what's necessary for the task.
- If you find a shortcut that works now but will break at scale, flag it and do it right.

## Commands

```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Production build (runs prisma generate first)
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
npm run test             # Run vitest in watch mode
npm run test:run         # Run all tests once
vitest run <path>        # Run specific test file

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio

# Docs
npm run docs:generate    # Regenerate file/route/module maps
npm run docs:check       # Validate docs coverage and sync

# Quality gates (required before merge)
npm run lint && npm run test:run && npm run typecheck && npm run docs:check
```

## Architecture

### Core Data Flow

Trckr is a Next.js App Router app for AI-assisted tracker generation. Users create trackers via chat, and the system renders them as interactive grids (table, kanban, form views) with bindings and conditional rules.

1. **Schema Flow**: Tracker schema loads from API → `TrackerAIView` coordinates AI generation → `TrackerDisplay` renders schema and emits updates → Save persists via PATCH
2. **Data Flow**: Snapshot fetched → passed to `TrackerDisplay` as grid data → user edits → Save persists snapshot
3. **Runtime Engines**: Grid rendering uses `lib/binding` (option resolution), `lib/field-rules` (visibility/required/disabled), `lib/field-validation`, `lib/field-calculation`, `lib/dynamic-options`

### Directory Structure

- `app/` — Routes and feature UI
  - `app/components/tracker-display/` — Schema runtime renderer/editor (tabs, sections, grids, field settings)
  - `app/components/tracker-page/` — Tracker chat and page-level presentation
  - `app/tracker/` — Tracker route orchestration and chat/generation flow
  - `app/api/` — HTTP boundary, auth checks, request/response validation
- `lib/` — Domain services and reusable runtime logic
  - `lib/repositories/` — Persistence + ownership checks for API routes
  - `lib/auth/server/` — Auth handler boundary
  - `lib/ai/` — Provider abstraction, AI config, timeout/logging
  - `lib/binding/`, `lib/field-rules/`, `lib/validate-tracker/` — Core domain engines
- `components/` — Shared UI primitives (shadcn-based)
- `prisma/` — Database schema (PostgreSQL)

### Module Boundaries

- UI (`app/components`) depends on `lib/*`
- API handlers depend on `lib/*` and DB layer
- `lib/*` modules do NOT depend on route components
- Feature orchestration stays near routes; cross-feature domain logic goes in `lib/*`

### API Handler Pattern

```typescript
// 1. Auth
const { userId } = await requireAuthenticatedUser()
// 2. Params/body validation with lib/api helpers + Zod
// 3. Repository/service calls
// 4. Return jsonOk / jsonError from lib/api/http
```

### Prompt-Building Functions (Agent & AI Flows)

**Critical rule**: All variables used in template literals must be function parameters.

When building prompts for AI agents/tools, prompt functions receive context data. **Every variable referenced in a template literal must be explicitly passed as a parameter** — never rely on outer scope or expect TypeScript to infer it.

**Anti-pattern**:
```typescript
export function buildSystemPrompt(purpose: string): string {
  return `Use gridId: ${gridId}` // ❌ gridId undefined — not a parameter
}
```

**Correct pattern**:
```typescript
export function buildSystemPrompt(purpose: string, gridId: string): string {
  return `Use gridId: ${gridId}` // ✅ gridId is a parameter
}
```

Apply this to all prompt builders (`buildSystemPrompt`, `buildUserPrompt`, etc.) in `app/api/agent/*/lib/prompts.ts`. Type-check with `npm run typecheck` to catch missing parameters at compile time.

## Code Conventions

### Theming

Import from `@/lib/theme` for all colors, surfaces, borders, shadows, and radius. Never use raw Tailwind color classes.

```tsx
import { theme } from '@/lib/theme'
className={cn(theme.surface.card, theme.border.default, theme.shadow.sm)}
```

- Use `theme.radius.md` (or `rounded-md`) for all boxed UI
- Use `theme.patterns.*` for common patterns (inputBase, card, menuPanel, menuItem)

### Component Patterns

- Use `cn()` from `@/lib/utils` for className composition
- Form fields: `border-input`, `hover:border-ring`, `shadow-xs`, `rounded-md`
- Status colors: `text-success`, `text-warning`, `text-destructive`, `text-info`

### UI Consistency

Every component must look like it belongs to the same product. No one-offs, no special-cased styles, no improvised layouts.

- **Spacing**: Use the same padding/gap scale throughout. Never hardcode arbitrary pixel values — use Tailwind spacing tokens.
- **Typography**: Headings, labels, body text, and captions must follow a consistent hierarchy. Do not introduce new font sizes outside the established scale.
- **Interactive states**: Every clickable element must have hover, focus, and disabled states — styled the same way as equivalent elements elsewhere.
- **Empty states, loading states, error states**: Every data-dependent component must render all three. They must look intentional, not like afterthoughts.
- **Iconography**: Use the same icon library (Lucide) at consistent sizes. Never mix icon sources.
- **Density**: Match the density of surrounding components. A compact table does not get a spacious modal next to it.
- **Polish bar**: If the component looks like it was generated by an AI and dropped in without review — flat, misaligned, generic — it is not done. Every component must feel considered. Correct proportions, proper visual hierarchy, real affordances.

### Code Safety and Correctness

Every function and component must be safe, correct, and free of latent defects before it ships.

- **No infinite loops**: Any loop or recursive call must have a provably reachable termination condition. Any `useEffect` with state updates must carefully audit its dependency array — missing or incorrect deps that cause re-render cycles are bugs, not warnings.
- **No hidden bugs**: Do not paper over edge cases with `|| fallback` without understanding why the value could be absent. Handle the root cause.
- **No dead code**: Remove unused imports, variables, props, types, and exports at the time you touch a file. Dead code is a maintenance liability.
- **No silent failures**: Functions that can fail must either return a typed error, throw with a useful message, or propagate explicitly. Never swallow exceptions with empty `catch` blocks.
- **No malicious or unsafe patterns**: No `eval`, no `dangerouslySetInnerHTML` with unsanitized input, no dynamic `require`, no unvalidated redirects, no credential logging.
- **No stale closures**: React callbacks and effects that capture state or props must be stable or correctly listed in dependency arrays.
- **Audit before shipping**: Before marking any task complete, re-read the diff and ask: does anything here loop infinitely, fail silently, leave dead code, or behave incorrectly at the boundary?

### Database

- Only modify schema in `prisma/schema.prisma` — do not add migrations directly
- Use repositories (`lib/repositories/`) for data access in API routes

## Testing

Tests use vitest and are colocated with source:
- `lib/**/__tests__/*.test.ts` or `lib/**/*.test.ts`
- Run single test: `vitest run lib/reports/calc-plan.test.ts`

## Key Files

- Entry routes: `/dashboard` (after sign-in), `/tracker/[id]` (tracker editing)
- Schema types: `prisma/schema.prisma`
- Theme config: `lib/theme/index.ts`
- Global styles: `app/globals.css`
