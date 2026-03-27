# Field Rules V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified AST-based field behavior engine that controls visibility, label, required, disabled, options, and value via configurable node triggers — extending the existing simple field rules system with full AST expression power and three input modalities.

**Architecture:** New `lib/field-rules-v2/` module adds a typed rule config, a pure sync resolver, and an override merge layer. A React hook `useFieldRulesV2` drives per-row resolution inside each grid component. UI lives in `field-settings/` alongside existing tabs, reusing `ExprRuleEditor` for all AST input (AI/JSON/Builder). The existing `fieldRulesByTarget` system is untouched and continues to work in parallel; V2 overrides win on conflict.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, existing `evaluateExpr` + `ExprNode` from `lib/functions/`, existing `ExprRuleEditor` (AI/JSON/Builder), vitest.

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `lib/field-rules-v2/types.ts` | All runtime types: `FieldRuleV2`, `NodeTrigger`, `RuleProperty`, `FieldRulesV2PropertyOverride`, `FieldRulesV2Map` |
| `lib/field-rules-v2/schema.ts` | Zod schemas for validation and storage |
| `lib/field-rules-v2/resolve.ts` | Pure sync function: `resolveFieldRulesV2ForRow()` |
| `lib/field-rules-v2/merge.ts` | `mergeV1V2Overrides()` — combine V1 `FieldOverride` with V2 property override |
| `lib/field-rules-v2/index.ts` | Barrel export |
| `lib/field-rules-v2/__tests__/resolve.test.ts` | Unit tests for resolver |
| `lib/field-rules-v2/__tests__/merge.test.ts` | Unit tests for merge |
| `lib/validate-tracker/validators/field-rules-v2.ts` | Validator for `fieldRulesV2` schema keys |
| `app/components/tracker-display/hooks/useFieldRulesV2.ts` | React hook: calls resolver per-row, handles async trigger state |
| `app/components/tracker-display/edit-mode/field-settings/NodeTriggerSelector.tsx` | `<Select>` for picking a `NodeTrigger` type |
| `app/components/tracker-display/edit-mode/field-settings/PropertySelector.tsx` | `<Select>` for picking a `RuleProperty` |
| `app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Editor.tsx` | Full editor for one `FieldRuleV2` (trigger + condition + property + outcome) |
| `app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Card.tsx` | Collapsed/expanded card for a rule in the list |
| `app/components/tracker-display/edit-mode/field-settings/FieldRulesV2Tab.tsx` | Tab content: rule list + add button |

### Modify
| File | Change |
|------|--------|
| `lib/field-rules/types.ts` | Extend `FieldOverride` with `label?: string` and `options?: unknown[]` |
| `lib/field-rules/overrides.ts` | Handle `label` and `options` in `applyFieldOverrides` |
| `lib/schemas/tracker.ts` | Add `fieldRulesV2: fieldRulesV2Schema` to the tracker schema object |
| `app/components/tracker-display/types.ts` | Add `fieldRulesV2?: FieldRulesV2Map` to `TrackerDisplayProps` |
| `lib/validate-tracker/types.ts` | Add `fieldRulesV2?: FieldRulesV2Map` to `TrackerLike` |
| `lib/validate-tracker/validators/index.ts` | Export `validateFieldRulesV2` |
| `lib/validate-tracker/index.ts` | Add `validateFieldRulesV2` to results array |
| `app/components/tracker-display/TrackerDisplayInline.tsx` | Destructure + pass `fieldRulesV2` through prop chain |
| Grid components (DivGrid, KanbanGrid, DataTable wrapper) | Call `useFieldRulesV2`, merge overrides with V1 via `mergeV1V2Overrides` |
| `app/components/tracker-display/edit-mode/expr/ExprRuleEditor.tsx` | Add `'field-rule'` to `mode` union |
| `app/api/generate-expr/route.ts` | Accept `purpose: 'field-rule'` |
| `app/api/generate-expr/lib/prompts.ts` | Add `'field-rule'` case to system + user prompt builders |
| `app/components/tracker-display/edit-mode/field-settings/useFieldSettingsState.ts` | Add `fieldRulesV2` state slice (init from schema, write back on save) |
| `app/components/tracker-display/edit-mode/field-settings/FieldSettingsDialog.tsx` | Add `fieldRulesV2` tab |
| `app/components/tracker-display/edit-mode/field-settings/types.ts` | Add `'fieldRulesV2'` to `allowedTabs` union |

---

## Task 1: Core Types

**Files:**
- Create: `lib/field-rules-v2/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/field-rules-v2/types.ts

import type { ExprNode } from '@/lib/functions/types'

export type RuleProperty =
  | 'visibility'  // true = visible (shown), false = hidden
  | 'label'       // string label override
  | 'required'    // boolean
  | 'disabled'    // boolean
  | 'options'     // array of { label, value, id? }
  | 'value'       // any value (routed to Value Engine)

export type NodeTriggerType =
  | 'onMount'
  | 'onRowCreate'
  | 'onRowCopy'
  | 'onFieldChange'
  | 'onConditionMet'
  | 'onUserContext'
  | 'onExternalBinding'
  | 'onRowFocus'
  | 'onDependencyResolve'

export type EngineType = 'property' | 'value'

export function deriveEngineType(property: RuleProperty): EngineType {
  return property === 'value' ? 'value' : 'property'
}

export interface FieldRuleV2 {
  id: string
  enabled: boolean
  trigger: NodeTriggerType
  /** For onFieldChange: which field to watch. For onConditionMet: the condition expr. */
  triggerConfig?: {
    watchedFieldId?: string    // onFieldChange
    contextVar?: 'user' | 'role' | 'team' | 'timezone'  // onUserContext
    sourceSchemaId?: string    // onExternalBinding
    fieldPath?: string         // onExternalBinding
    refreshIntervalMs?: number // onExternalBinding
    linkedFieldId?: string     // onDependencyResolve
    recordPath?: string        // onDependencyResolve
    condition?: ExprNode       // onConditionMet
  }
  /** Guard expression — if present, rule only fires when this evaluates truthy. */
  condition?: ExprNode
  property: RuleProperty
  outcome: ExprNode
  engineType: EngineType
  label?: string
}

/** Top-level map stored in schema: keyed by "gridId.fieldId" (target field). */
export type FieldRulesV2Map = Record<string, FieldRuleV2[]>

/** Overrides produced by the Property Engine for one field. */
export interface FieldRulesV2PropertyOverride {
  visibility?: boolean
  label?: string
  required?: boolean
  disabled?: boolean
  options?: Array<{ label: string; value: unknown; id?: string }>
}

/** Full output of V2 resolution for a grid row (keyed by fieldId). */
export interface FieldRulesV2Overrides {
  propertyOverrides: Record<string, FieldRulesV2PropertyOverride>
  valueOverrides: Record<string, unknown>
}

/** Triggers that can be evaluated synchronously at render time. */
export const SYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onMount',
  'onRowCreate',
  'onRowCopy',
  'onFieldChange',
  'onConditionMet',
  'onUserContext',
  'onRowFocus',
]

/** Triggers that require async resolution (not yet implemented; stubbed). */
export const ASYNC_TRIGGER_TYPES: NodeTriggerType[] = [
  'onExternalBinding',
  'onDependencyResolve',
]
```

- [ ] **Step 2: Commit**

```bash
git add lib/field-rules-v2/types.ts
git commit -m "feat(field-rules-v2): add core types"
```

---

## Task 2: Zod Schema

**Files:**
- Create: `lib/field-rules-v2/schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
// lib/field-rules-v2/schema.ts

import { z } from 'zod'

// Use z.any() for ExprNode fields — same pattern as calculationsSchema.
// The runtime evaluator validates these at rule execution time.
const exprNodeSchema = z.any()

const nodeTriggerTypeSchema = z.enum([
  'onMount',
  'onRowCreate',
  'onRowCopy',
  'onFieldChange',
  'onConditionMet',
  'onUserContext',
  'onExternalBinding',
  'onRowFocus',
  'onDependencyResolve',
])

const triggerConfigSchema = z
  .object({
    watchedFieldId: z.string().optional(),
    contextVar: z.enum(['user', 'role', 'team', 'timezone']).optional(),
    sourceSchemaId: z.string().optional(),
    fieldPath: z.string().optional(),
    refreshIntervalMs: z.number().optional(),
    linkedFieldId: z.string().optional(),
    recordPath: z.string().optional(),
    condition: exprNodeSchema.optional(),
  })
  .passthrough()
  .optional()

export const fieldRuleV2Schema = z
  .object({
    id: z.string(),
    enabled: z.boolean().default(true),
    trigger: nodeTriggerTypeSchema,
    triggerConfig: triggerConfigSchema,
    condition: exprNodeSchema.optional(),
    property: z.enum(['visibility', 'label', 'required', 'disabled', 'options', 'value']),
    outcome: exprNodeSchema,
    engineType: z.enum(['property', 'value']),
    label: z.string().optional(),
  })
  .passthrough()

export const fieldRulesV2Schema = z
  .record(z.string(), z.array(fieldRuleV2Schema))
  .optional()
  .describe('AST-based field behavior rules keyed by target field path (gridId.fieldId).')
```

- [ ] **Step 2: Commit**

```bash
git add lib/field-rules-v2/schema.ts
git commit -m "feat(field-rules-v2): add Zod schema"
```

---

## Task 3: Resolution Engine + Tests

**Files:**
- Create: `lib/field-rules-v2/resolve.ts`
- Create: `lib/field-rules-v2/__tests__/resolve.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/field-rules-v2/__tests__/resolve.test.ts

import { describe, it, expect } from 'vitest'
import { resolveFieldRulesV2ForRow } from '../resolve'
import type { FieldRuleV2, FieldRulesV2Map } from '../types'

const constExpr = (value: unknown) => ({ op: 'const' as const, value })
const fieldExpr = (fieldId: string) => ({ op: 'field' as const, fieldId })
const eqExpr = (left: unknown, right: unknown) => ({
  op: 'eq' as const,
  left,
  right,
})

function makeRule(overrides: Partial<FieldRuleV2>): FieldRuleV2 {
  return {
    id: 'r1',
    enabled: true,
    trigger: 'onMount',
    property: 'visibility',
    outcome: constExpr(true),
    engineType: 'property',
    ...overrides,
  }
}

describe('resolveFieldRulesV2ForRow', () => {
  it('returns empty overrides when no rules', () => {
    const result = resolveFieldRulesV2ForRow({}, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides).toEqual({})
    expect(result.valueOverrides).toEqual({})
  })

  it('applies visibility rule — true means visible (not hidden)', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ property: 'visibility', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.visibility).toBe(true)
  })

  it('applies required rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ property: 'required', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.required).toBe(true)
  })

  it('applies disabled rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.status': [makeRule({ property: 'disabled', outcome: constExpr(false) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['status']?.disabled).toBe(false)
  })

  it('applies label rule', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.notes': [makeRule({ property: 'label', outcome: constExpr('Remarks') })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['notes']?.label).toBe('Remarks')
  })

  it('applies value rule via value engine', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.total': [
        makeRule({ property: 'value', outcome: constExpr(42), engineType: 'value' }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.valueOverrides['total']).toBe(42)
  })

  it('skips disabled rules', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ enabled: false, outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })

  it('skips rules where condition evaluates falsy', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [
        makeRule({
          condition: constExpr(false),
          outcome: constExpr(true),
        }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })

  it('evaluates condition against rowValues', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.blocked_reason': [
        makeRule({
          trigger: 'onFieldChange',
          triggerConfig: { watchedFieldId: 'tasks_grid.status' },
          condition: eqExpr(fieldExpr('tasks_grid.status'), constExpr('blocked')),
          property: 'visibility',
          outcome: constExpr(true),
        }),
      ],
    }
    const withBlocked = resolveFieldRulesV2ForRow(
      map,
      'tasks_grid',
      { 'tasks_grid.status': 'blocked' },
      0,
    )
    expect(withBlocked.propertyOverrides['blocked_reason']?.visibility).toBe(true)

    const withoutBlocked = resolveFieldRulesV2ForRow(
      map,
      'tasks_grid',
      { 'tasks_grid.status': 'open' },
      0,
    )
    expect(withoutBlocked.propertyOverrides['blocked_reason']).toBeUndefined()
  })

  it('last-writer wins when multiple rules target same property', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [
        makeRule({ id: 'r1', outcome: constExpr(false), property: 'required' }),
        makeRule({ id: 'r2', outcome: constExpr(true), property: 'required' }),
      ],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']?.required).toBe(true)
  })

  it('ignores rules targeting other grids', () => {
    const map: FieldRulesV2Map = {
      'other_grid.field': [makeRule({ outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides).toEqual({})
  })

  it('skips async trigger types', () => {
    const map: FieldRulesV2Map = {
      'tasks_grid.title': [makeRule({ trigger: 'onExternalBinding', outcome: constExpr(true) })],
    }
    const result = resolveFieldRulesV2ForRow(map, 'tasks_grid', {}, 0)
    expect(result.propertyOverrides['title']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
vitest run lib/field-rules-v2/__tests__/resolve.test.ts
```
Expected: FAIL with "Cannot find module '../resolve'"

- [ ] **Step 3: Implement resolver**

```typescript
// lib/field-rules-v2/resolve.ts

import { evaluateExpr } from '@/lib/functions/evaluator'
import type { FunctionContext } from '@/lib/functions/types'
import {
  SYNC_TRIGGER_TYPES,
  type FieldRulesV2Map,
  type FieldRulesV2Overrides,
  type FieldRulesV2PropertyOverride,
} from './types'

/**
 * Resolves Field Rules V2 for a single grid row synchronously.
 *
 * Only SYNC_TRIGGER_TYPES are evaluated here. Async triggers
 * (onExternalBinding, onDependencyResolve) are handled separately in
 * useFieldRulesV2 with React state.
 *
 * Called at render time — must be pure and fast.
 */
export function resolveFieldRulesV2ForRow(
  fieldRulesV2: FieldRulesV2Map | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  _rowIndex: number,
): FieldRulesV2Overrides {
  const propertyOverrides: Record<string, FieldRulesV2PropertyOverride> = {}
  const valueOverrides: Record<string, unknown> = {}

  if (!fieldRulesV2) return { propertyOverrides, valueOverrides }

  const prefix = `${gridId}.`

  for (const [targetPath, rules] of Object.entries(fieldRulesV2)) {
    if (!targetPath.startsWith(prefix)) continue
    const fieldId = targetPath.slice(prefix.length)

    const fnCtx: FunctionContext = {
      rowValues,
      fieldId,
    }

    for (const rule of rules) {
      if (!rule.enabled) continue
      if (!SYNC_TRIGGER_TYPES.includes(rule.trigger)) continue

      // Evaluate guard condition
      if (rule.condition) {
        const pass = evaluateExpr(rule.condition as never, fnCtx)
        if (!pass) continue
      }

      // Evaluate outcome expression
      const value = evaluateExpr(rule.outcome as never, fnCtx)

      if (rule.engineType === 'value') {
        valueOverrides[fieldId] = value
      } else {
        const override = propertyOverrides[fieldId] ?? {}
        switch (rule.property) {
          case 'visibility':
            override.visibility = Boolean(value)
            break
          case 'label':
            if (typeof value === 'string') override.label = value
            break
          case 'required':
            override.required = Boolean(value)
            break
          case 'disabled':
            override.disabled = Boolean(value)
            break
          case 'options':
            if (Array.isArray(value)) {
              override.options = value as FieldRulesV2PropertyOverride['options']
            }
            break
        }
        propertyOverrides[fieldId] = override
      }
    }
  }

  return { propertyOverrides, valueOverrides }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
vitest run lib/field-rules-v2/__tests__/resolve.test.ts
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/field-rules-v2/resolve.ts lib/field-rules-v2/__tests__/resolve.test.ts
git commit -m "feat(field-rules-v2): add sync resolver with tests"
```

---

## Task 4: Override Merge + Extend FieldOverride

**Files:**
- Modify: `lib/field-rules/types.ts`
- Modify: `lib/field-rules/overrides.ts`
- Create: `lib/field-rules-v2/merge.ts`
- Create: `lib/field-rules-v2/__tests__/merge.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/field-rules-v2/__tests__/merge.test.ts

import { describe, it, expect } from 'vitest'
import { mergeV1V2Overrides } from '../merge'

describe('mergeV1V2Overrides', () => {
  it('returns empty override when both are undefined', () => {
    expect(mergeV1V2Overrides(undefined, undefined)).toEqual({})
  })

  it('returns V1 override when V2 is undefined', () => {
    expect(mergeV1V2Overrides({ isHidden: true }, undefined)).toEqual({ isHidden: true })
  })

  it('maps V2 visibility=false to isHidden=true', () => {
    const result = mergeV1V2Overrides(undefined, { visibility: false })
    expect(result.isHidden).toBe(true)
  })

  it('maps V2 visibility=true to isHidden=false', () => {
    const result = mergeV1V2Overrides(undefined, { visibility: true })
    expect(result.isHidden).toBe(false)
  })

  it('maps V2 required to isRequired', () => {
    expect(mergeV1V2Overrides(undefined, { required: true }).isRequired).toBe(true)
  })

  it('maps V2 disabled to isDisabled', () => {
    expect(mergeV1V2Overrides(undefined, { disabled: true }).isDisabled).toBe(true)
  })

  it('passes V2 label through', () => {
    expect(mergeV1V2Overrides(undefined, { label: 'Alt Label' }).label).toBe('Alt Label')
  })

  it('passes V2 options through', () => {
    const opts = [{ label: 'A', value: 'a' }]
    expect(mergeV1V2Overrides(undefined, { options: opts }).options).toEqual(opts)
  })

  it('V2 wins over V1 on same property', () => {
    // V1 says hidden; V2 says visible — V2 wins
    const result = mergeV1V2Overrides({ isHidden: true }, { visibility: true })
    expect(result.isHidden).toBe(false)
  })

  it('merges non-conflicting V1 and V2 fields', () => {
    const result = mergeV1V2Overrides({ isRequired: true }, { disabled: true, label: 'X' })
    expect(result.isRequired).toBe(true)
    expect(result.isDisabled).toBe(true)
    expect(result.label).toBe('X')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
vitest run lib/field-rules-v2/__tests__/merge.test.ts
```
Expected: FAIL with "Cannot find module '../merge'"

- [ ] **Step 3: Extend `FieldOverride` in `lib/field-rules/types.ts`**

Open `lib/field-rules/types.ts` and replace:
```typescript
export type FieldOverride = {
  isHidden?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  value?: unknown
}
```
With:
```typescript
export type FieldOverride = {
  isHidden?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  value?: unknown
  /** Label override from Field Rules V2. Rendered in place of field.ui.label. */
  label?: string
  /** Options override from Field Rules V2. Replaces bound/static options. */
  options?: unknown[]
}
```

- [ ] **Step 4: Implement `mergeV1V2Overrides`**

```typescript
// lib/field-rules-v2/merge.ts

import type { FieldOverride } from '@/lib/field-rules/types'
import type { FieldRulesV2PropertyOverride } from './types'

/**
 * Merges V1 FieldOverride with V2 property override into a single FieldOverride.
 * V2 values win on conflict. Neither argument is mutated.
 */
export function mergeV1V2Overrides(
  v1: FieldOverride | undefined,
  v2: FieldRulesV2PropertyOverride | undefined,
): FieldOverride {
  if (!v1 && !v2) return {}

  const merged: FieldOverride = { ...v1 }

  if (!v2) return merged

  // visibility: true = shown (isHidden = false), false = hidden (isHidden = true)
  if (v2.visibility !== undefined) {
    merged.isHidden = !v2.visibility
  }
  if (v2.required !== undefined) {
    merged.isRequired = v2.required
  }
  if (v2.disabled !== undefined) {
    merged.isDisabled = v2.disabled
  }
  if (v2.label !== undefined) {
    merged.label = v2.label
  }
  if (v2.options !== undefined) {
    merged.options = v2.options
  }

  return merged
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
vitest run lib/field-rules-v2/__tests__/merge.test.ts
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/field-rules/types.ts lib/field-rules-v2/merge.ts lib/field-rules-v2/__tests__/merge.test.ts
git commit -m "feat(field-rules-v2): add merge utility; extend FieldOverride with label+options"
```

---

## Task 5: Barrel Export

**Files:**
- Create: `lib/field-rules-v2/index.ts`

- [ ] **Step 1: Create barrel**

```typescript
// lib/field-rules-v2/index.ts

export * from './types'
export * from './resolve'
export * from './merge'
```

- [ ] **Step 2: Commit**

```bash
git add lib/field-rules-v2/index.ts
git commit -m "feat(field-rules-v2): add barrel export"
```

---

## Task 6: Schema Storage — tracker.ts + TrackerDisplayProps

**Files:**
- Modify: `lib/schemas/tracker.ts`
- Modify: `app/components/tracker-display/types.ts`

- [ ] **Step 1: Add `fieldRulesV2` to `lib/schemas/tracker.ts`**

At the top of `lib/schemas/tracker.ts`, add the import:
```typescript
import { fieldRulesV2Schema } from '@/lib/field-rules-v2/schema'
```

In the tracker schema object (around line 363, after `fieldRulesByTarget`), add:
```typescript
    fieldRulesV2: fieldRulesV2Schema,
```

- [ ] **Step 2: Add `fieldRulesV2` to `TrackerDisplayProps`**

In `app/components/tracker-display/types.ts`, add to the import:
```typescript
import type { FieldRulesV2Map } from '@/lib/field-rules-v2/types'
```

In `TrackerDisplayProps`, after the `fieldRulesByTarget` line:
```typescript
  fieldRulesV2?: FieldRulesV2Map
```

- [ ] **Step 3: Verify no type errors**

```bash
npm run typecheck 2>&1 | head -30
```
Expected: no errors related to the new fields.

- [ ] **Step 4: Commit**

```bash
git add lib/schemas/tracker.ts app/components/tracker-display/types.ts
git commit -m "feat(field-rules-v2): add fieldRulesV2 to tracker schema and display types"
```

---

## Task 7: Validator

**Files:**
- Create: `lib/validate-tracker/validators/field-rules-v2.ts`
- Modify: `lib/validate-tracker/types.ts`
- Modify: `lib/validate-tracker/validators/index.ts`
- Modify: `lib/validate-tracker/index.ts`

- [ ] **Step 1: Extend `TrackerLike` in `lib/validate-tracker/types.ts`**

Add to the `TrackerLike` interface (or type intersection):
```typescript
  fieldRulesV2?: import('@/lib/field-rules-v2').FieldRulesV2Map
```

- [ ] **Step 2: Create validator**

```typescript
// lib/validate-tracker/validators/field-rules-v2.ts

import type { ValidationContext, ValidatorResult } from '../types'
import type { FieldRulesV2Map } from '@/lib/field-rules-v2/types'
import { deriveEngineType } from '@/lib/field-rules-v2/types'

/**
 * Validates fieldRulesV2 entries.
 * Issues warnings (not errors) to remain forward-compatible with new rule shapes.
 */
export function validateFieldRulesV2(
  fieldRulesV2: FieldRulesV2Map | undefined,
  ctx: ValidationContext,
): ValidatorResult {
  if (!fieldRulesV2) return { errors: [], warnings: [] }

  const warnings: string[] = []
  const seenIds = new Map<string, Set<string>>() // path -> ids

  for (const [path, rules] of Object.entries(fieldRulesV2)) {
    const dotIdx = path.indexOf('.')
    if (dotIdx < 1) {
      warnings.push(`fieldRulesV2: key "${path}" must be "gridId.fieldId" format`)
      continue
    }
    const gridId = path.slice(0, dotIdx)
    const fieldId = path.slice(dotIdx + 1)

    if (!ctx.gridIds?.includes(gridId)) {
      warnings.push(`fieldRulesV2: key "${path}" references unknown grid "${gridId}"`)
    }
    if (ctx.fieldPaths && !ctx.fieldPaths.includes(path)) {
      warnings.push(`fieldRulesV2: key "${path}" references unknown field "${fieldId}" in grid "${gridId}"`)
    }

    const idsForPath = seenIds.get(path) ?? new Set()
    seenIds.set(path, idsForPath)

    for (const rule of rules) {
      if (!rule.id) {
        warnings.push(`fieldRulesV2["${path}"]: rule is missing required "id"`)
      } else if (idsForPath.has(rule.id)) {
        warnings.push(`fieldRulesV2["${path}"]: duplicate rule id "${rule.id}"`)
      } else {
        idsForPath.add(rule.id)
      }

      if (!rule.outcome) {
        warnings.push(`fieldRulesV2["${path}"] rule "${rule.id}": missing "outcome" expression`)
      }

      const expectedEngine = deriveEngineType(rule.property)
      if (rule.engineType !== expectedEngine) {
        warnings.push(
          `fieldRulesV2["${path}"] rule "${rule.id}": engineType "${rule.engineType}" does not match property "${rule.property}" (expected "${expectedEngine}")`,
        )
      }
    }
  }

  return { errors: [], warnings }
}
```

- [ ] **Step 3: Export from validators index**

In `lib/validate-tracker/validators/index.ts`, add:
```typescript
export { validateFieldRulesV2 } from './field-rules-v2'
```

- [ ] **Step 4: Register in main validator**

In `lib/validate-tracker/index.ts`, import and add to the results array:
```typescript
import { validateFieldRulesV2 } from './validators/field-rules-v2'

// Inside validateTracker(), alongside the other validator calls:
validateFieldRulesV2(tracker.fieldRulesV2, ctx),
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/validate-tracker/
git commit -m "feat(field-rules-v2): add validator for fieldRulesV2"
```

---

## Task 8: React Hook — useFieldRulesV2

**Files:**
- Create: `app/components/tracker-display/hooks/useFieldRulesV2.ts`

- [ ] **Step 1: Create hook**

```typescript
// app/components/tracker-display/hooks/useFieldRulesV2.ts
'use client'

import { useMemo } from 'react'
import { resolveFieldRulesV2ForRow } from '@/lib/field-rules-v2/resolve'
import type { FieldRulesV2Map, FieldRulesV2Overrides } from '@/lib/field-rules-v2/types'

/**
 * Resolves Field Rules V2 for a single grid row.
 *
 * Sync triggers are resolved inline (pure function, no state).
 * Async triggers (onExternalBinding, onDependencyResolve) are not yet
 * implemented — they will require a separate effect-based extension.
 */
export function useFieldRulesV2(
  fieldRulesV2: FieldRulesV2Map | undefined,
  gridId: string,
  rowValues: Record<string, unknown>,
  rowIndex: number,
): FieldRulesV2Overrides {
  return useMemo(
    () => resolveFieldRulesV2ForRow(fieldRulesV2, gridId, rowValues, rowIndex),
    // rowValues identity changes per-render in grids; memoization is on the grid level
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fieldRulesV2, gridId, rowIndex, JSON.stringify(rowValues)],
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/tracker-display/hooks/useFieldRulesV2.ts
git commit -m "feat(field-rules-v2): add useFieldRulesV2 React hook"
```

---

## Task 9: TrackerDisplay Prop Threading + Grid Integration

**Files:**
- Modify: `app/components/tracker-display/TrackerDisplayInline.tsx`
- Modify: prop chain to grid components (grep for `fieldRulesByTarget` to find all passthrough sites)
- Modify: `app/components/tracker-display/grids/div/TrackerDivGrid.tsx` (primary V1 integration site)

- [ ] **Step 1: Find all prop-chain files**

```bash
grep -rn "fieldRulesByTarget" app/components/tracker-display/ --include="*.tsx" --include="*.ts" -l
```
These files all need `fieldRulesV2?: FieldRulesV2Map` added to their props interface and forwarded.

- [ ] **Step 2: Add `fieldRulesV2` to `TrackerDisplayInline.tsx`**

Destructure `fieldRulesV2` from props:
```typescript
const { ..., fieldRulesV2 } = props
```

In the `editModeSchema` useMemo (or wherever `fieldRulesByTarget` is set on the schema), add:
```typescript
  fieldRulesV2: fieldRulesV2,
```

Pass `fieldRulesV2={fieldRulesV2}` down to `TrackerTabContent`.

- [ ] **Step 3: Thread through each component in the chain**

For each file found in Step 1, add:
- `fieldRulesV2?: FieldRulesV2Map` to the props interface (import type from `@/lib/field-rules-v2/types`)
- `fieldRulesV2={fieldRulesV2}` to the child component call

- [ ] **Step 4: Integrate in `TrackerDivGrid.tsx`**

Find the site where `resolveFieldRuleOverrides` is called and `applyFieldOverrides` is applied (search for `applyFieldOverrides` in the file). Add V2 merging alongside it:

```typescript
import { useFieldRulesV2 } from '../hooks/useFieldRulesV2'
import { mergeV1V2Overrides } from '@/lib/field-rules-v2/merge'

// Inside the component or row render function:
const v2Overrides = useFieldRulesV2(fieldRulesV2, gridId, rowValues, rowIndex)

// Replace the existing:
//   const mergedConfig = applyFieldOverrides(field.config, v1Override)
// With:
const combinedOverride = mergeV1V2Overrides(
  v1Override,
  v2Overrides.propertyOverrides[fieldId],
)
const mergedConfig = applyFieldOverrides(field.config, combinedOverride)

// Also apply value override if present:
const effectiveValue = v2Overrides.valueOverrides[fieldId] !== undefined
  ? v2Overrides.valueOverrides[fieldId]
  : currentValue
```

- [ ] **Step 5: Repeat Step 4 for Kanban and data-table**

Run:
```bash
grep -rn "applyFieldOverrides\|resolveFieldRuleOverrides" app/components/tracker-display/ --include="*.tsx" -l
```
Apply the same V2 merge pattern at each override site.

- [ ] **Step 6: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/components/tracker-display/
git commit -m "feat(field-rules-v2): wire fieldRulesV2 prop chain and grid override merging"
```

---

## Task 10: AI Generation Extension

**Files:**
- Modify: `app/components/tracker-display/edit-mode/expr/ExprRuleEditor.tsx`
- Modify: `app/api/generate-expr/route.ts`
- Modify: `app/api/generate-expr/lib/prompts.ts`

- [ ] **Step 1: Add `'field-rule'` to `ExprRuleEditor` mode**

In `ExprRuleEditor.tsx`, change the `mode` prop type from:
```typescript
mode?: 'validation' | 'calculation'
```
to:
```typescript
mode?: 'validation' | 'calculation' | 'field-rule'
```

The `mode` is already forwarded to `POST /api/generate-expr` as `purpose`. The API needs to accept `'field-rule'` and use tailored prompt instructions.

- [ ] **Step 2: Accept `'field-rule'` in `route.ts`**

In `app/api/generate-expr/route.ts`, find the purpose validation (likely a `z.enum` or string check). Extend it to include `'field-rule'`:

```typescript
// Find: purpose: z.enum(['validation', 'calculation'])
// Change to:
purpose: z.enum(['validation', 'calculation', 'field-rule'])
```

- [ ] **Step 3: Add `'field-rule'` case in `prompts.ts`**

In `app/api/generate-expr/lib/prompts.ts`, in `buildSystemPrompt`:
```typescript
// Add to the purpose-specific instructions section:
: purpose === 'field-rule'
  ? [
      'You are generating a field rule outcome expression.',
      'The expression must evaluate to the correct type for the target property:',
      '  - visibility: boolean (true = visible/shown, false = hidden)',
      '  - required / disabled: boolean',
      '  - label: string',
      '  - options: array of { label: string, value: unknown }',
      '  - value: any type matching the target field type',
      'Use field references with "gridId.fieldId" format.',
      'Keep expressions minimal — prefer { op: "const", value: X } over complex logic when the outcome is static.',
    ].join('\n')
  : ''
```

In `buildUserPrompt`, add a `'field-rule'` label (alongside `'validation'` and `'calculation'`):
```typescript
const taskLabel =
  purpose === 'calculation' ? 'calculation expression'
  : purpose === 'field-rule' ? 'field rule outcome expression'
  : 'validation expression'
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/components/tracker-display/edit-mode/expr/ExprRuleEditor.tsx \
        app/api/generate-expr/route.ts \
        app/api/generate-expr/lib/prompts.ts
git commit -m "feat(field-rules-v2): extend AI expression generation with 'field-rule' purpose"
```

---

## Task 11: UI — NodeTriggerSelector

**Files:**
- Create: `app/components/tracker-display/edit-mode/field-settings/NodeTriggerSelector.tsx`

- [ ] **Step 1: Create component**

```typescript
// app/components/tracker-display/edit-mode/field-settings/NodeTriggerSelector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NodeTriggerType } from '@/lib/field-rules-v2/types'

interface NodeTriggerOption {
  value: NodeTriggerType
  label: string
  description: string
}

const LIFECYCLE_TRIGGERS: NodeTriggerOption[] = [
  { value: 'onMount', label: 'On Load', description: 'Fires when the tracker first loads' },
  { value: 'onRowCreate', label: 'On Row Create', description: 'Fires when a new row is added' },
  { value: 'onRowCopy', label: 'On Row Copy', description: 'Fires when a row is duplicated' },
  { value: 'onRowFocus', label: 'On Row Focus', description: 'Fires when a row enters edit mode' },
]

const REACTIVE_TRIGGERS: NodeTriggerOption[] = [
  {
    value: 'onFieldChange',
    label: 'On Field Change',
    description: 'Fires when a specific field value changes',
  },
  {
    value: 'onConditionMet',
    label: 'On Condition Met',
    description: 'Fires when a boolean expression becomes true',
  },
  {
    value: 'onUserContext',
    label: 'On User Context',
    description: 'Fires based on current user, role, or team',
  },
]

const EXTERNAL_TRIGGERS: NodeTriggerOption[] = [
  {
    value: 'onExternalBinding',
    label: 'On External Binding',
    description: 'Fires when data is pulled from another tracker or API',
  },
  {
    value: 'onDependencyResolve',
    label: 'On Dependency Resolve',
    description: 'Fires when a linked record field gets a value',
  },
]

interface NodeTriggerSelectorProps {
  value: NodeTriggerType
  onChange: (value: NodeTriggerType) => void
  disabled?: boolean
}

export function NodeTriggerSelector({ value, onChange, disabled }: NodeTriggerSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange as (v: string) => void} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select trigger…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Lifecycle
          </SelectLabel>
          {LIFECYCLE_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Reactive
          </SelectLabel>
          {REACTIVE_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            External
          </SelectLabel>
          {EXTERNAL_TRIGGERS.map((t) => (
            <SelectItem key={t.value} value={t.value} className="text-xs">
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 text-muted-foreground">{t.description}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/NodeTriggerSelector.tsx
git commit -m "feat(field-rules-v2): add NodeTriggerSelector UI component"
```

---

## Task 12: UI — PropertySelector

**Files:**
- Create: `app/components/tracker-display/edit-mode/field-settings/PropertySelector.tsx`

- [ ] **Step 1: Create component**

```typescript
// app/components/tracker-display/edit-mode/field-settings/PropertySelector.tsx
'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { deriveEngineType, type RuleProperty, type EngineType } from '@/lib/field-rules-v2/types'

interface PropertyOption {
  value: RuleProperty
  label: string
  description: string
}

const UI_PROPERTIES: PropertyOption[] = [
  { value: 'visibility', label: 'Show / Hide', description: 'Controls field visibility' },
  { value: 'required', label: 'Required', description: 'Marks field as required' },
  { value: 'disabled', label: 'Disabled', description: 'Makes field read-only' },
  { value: 'label', label: 'Label text', description: 'Overrides the field label' },
  { value: 'options', label: 'Options', description: 'Replaces select/multiselect options' },
]

const DATA_PROPERTIES: PropertyOption[] = [
  { value: 'value', label: 'Value', description: 'Sets the field value programmatically' },
]

interface PropertySelectorProps {
  value: RuleProperty
  onChange: (property: RuleProperty, engineType: EngineType) => void
  disabled?: boolean
}

export function PropertySelector({ value, onChange, disabled }: PropertySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => {
          const prop = v as RuleProperty
          onChange(prop, deriveEngineType(prop))
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder="Select property…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              UI State
            </SelectLabel>
            {UI_PROPERTIES.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-muted-foreground">{p.description}</span>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Data
            </SelectLabel>
            {DATA_PROPERTIES.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-muted-foreground">{p.description}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Badge
        variant="outline"
        className="shrink-0 text-[10px] h-5 px-1.5 font-mono border-border/60"
      >
        {deriveEngineType(value) === 'property' ? 'UI' : 'Data'}
      </Badge>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/PropertySelector.tsx
git commit -m "feat(field-rules-v2): add PropertySelector UI component"
```

---

## Task 13: UI — FieldRuleV2Editor

**Files:**
- Create: `app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Editor.tsx`

- [ ] **Step 1: Create component**

```typescript
// app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Editor.tsx
'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { ExprRuleEditor } from '../expr/ExprRuleEditor'
import { NodeTriggerSelector } from './NodeTriggerSelector'
import { PropertySelector } from './PropertySelector'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRuleV2 } from '@/lib/field-rules-v2/types'
import type { ExprNode } from '@/lib/functions/types'

const EMPTY_EXPR: ExprNode = { op: 'const', value: null } as unknown as ExprNode

interface FieldRuleV2EditorProps {
  rule: FieldRuleV2
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
  onChange: (rule: FieldRuleV2) => void
}

export function FieldRuleV2Editor({
  rule,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  trackerSchemaId,
  onChange,
}: FieldRuleV2EditorProps) {
  const [showCondition, setShowCondition] = useState(Boolean(rule.condition))

  function patch(updates: Partial<FieldRuleV2>) {
    onChange({ ...rule, ...updates })
  }

  return (
    <div className="space-y-4 py-1">
      {/* Trigger */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Trigger</Label>
        <NodeTriggerSelector
          value={rule.trigger}
          onChange={(trigger) => patch({ trigger })}
        />
      </div>

      {/* Optional condition guard */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Condition (optional)</Label>
          <button
            type="button"
            onClick={() => {
              const next = !showCondition
              setShowCondition(next)
              if (!next) patch({ condition: undefined })
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {showCondition ? 'Remove' : 'Add condition'}
          </button>
        </div>
        {showCondition && (
          <ExprRuleEditor
            expr={(rule.condition ?? EMPTY_EXPR) as ExprNode}
            gridId={gridId}
            fieldId={fieldId}
            availableFields={availableFields}
            currentTracker={currentTracker}
            trackerSchemaId={trackerSchemaId}
            mode="validation"
            onChange={(condition) => patch({ condition })}
          />
        )}
        {!showCondition && (
          <p className="text-[11px] text-muted-foreground">
            Rule fires every time the trigger activates.
          </p>
        )}
      </div>

      {/* Property */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Affects</Label>
        <PropertySelector
          value={rule.property}
          onChange={(property, engineType) => patch({ property, engineType })}
        />
      </div>

      {/* Outcome */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Set to</Label>
        <ExprRuleEditor
          expr={(rule.outcome ?? EMPTY_EXPR) as ExprNode}
          gridId={gridId}
          fieldId={fieldId}
          availableFields={availableFields}
          currentTracker={currentTracker}
          trackerSchemaId={trackerSchemaId}
          mode="field-rule"
          onChange={(outcome) => patch({ outcome })}
        />
      </div>

      {/* Label + Enabled */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rule name (optional)</Label>
          <Input
            className={cn(theme.patterns.inputBase, 'h-7 text-xs')}
            placeholder="e.g. Hide when closed"
            value={rule.label ?? ''}
            onChange={(e) => patch({ label: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch
            checked={rule.enabled}
            onCheckedChange={(enabled) => patch({ enabled })}
            className="scale-90"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Editor.tsx
git commit -m "feat(field-rules-v2): add FieldRuleV2Editor component"
```

---

## Task 14: UI — FieldRuleV2Card

**Files:**
- Create: `app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Card.tsx`

- [ ] **Step 1: Create component**

```typescript
// app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Card.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { FieldRuleV2Editor } from './FieldRuleV2Editor'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRuleV2 } from '@/lib/field-rules-v2/types'

const TRIGGER_LABELS: Record<string, string> = {
  onMount: 'On Load',
  onRowCreate: 'On Create',
  onRowCopy: 'On Copy',
  onRowFocus: 'On Focus',
  onFieldChange: 'Field Change',
  onConditionMet: 'Condition',
  onUserContext: 'User Context',
  onExternalBinding: 'External',
  onDependencyResolve: 'Dependency',
}

const PROPERTY_LABELS: Record<string, string> = {
  visibility: 'Show/Hide',
  required: 'Required',
  disabled: 'Disabled',
  label: 'Label',
  options: 'Options',
  value: 'Value',
}

interface FieldRuleV2CardProps {
  rule: FieldRuleV2
  gridId: string
  fieldId: string
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
  onChange: (rule: FieldRuleV2) => void
  onRemove: () => void
}

export function FieldRuleV2Card({
  rule,
  gridId,
  fieldId,
  availableFields,
  currentTracker,
  trackerSchemaId,
  onChange,
  onRemove,
}: FieldRuleV2CardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className={cn(
        theme.surface.card,
        theme.border.default,
        theme.radius.md,
        'overflow-hidden',
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 font-mono">
            {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
          </Badge>
          <span className="text-[11px] text-muted-foreground">→</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
            {PROPERTY_LABELS[rule.property] ?? rule.property}
          </Badge>
          {rule.label && (
            <span className="text-[11px] text-muted-foreground truncate">{rule.label}</span>
          )}
        </div>
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={rule.enabled}
            onCheckedChange={(enabled) => onChange({ ...rule, enabled })}
            className="scale-75"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="text-muted-foreground shrink-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/40">
          <FieldRuleV2Editor
            rule={rule}
            gridId={gridId}
            fieldId={fieldId}
            availableFields={availableFields}
            currentTracker={currentTracker}
            trackerSchemaId={trackerSchemaId}
            onChange={onChange}
          />
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/FieldRuleV2Card.tsx
git commit -m "feat(field-rules-v2): add FieldRuleV2Card component"
```

---

## Task 15: UI — FieldRulesV2Tab

**Files:**
- Create: `app/components/tracker-display/edit-mode/field-settings/FieldRulesV2Tab.tsx`

- [ ] **Step 1: Create component**

```typescript
// app/components/tracker-display/edit-mode/field-settings/FieldRulesV2Tab.tsx
'use client'

import { Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import { FieldRuleV2Card } from './FieldRuleV2Card'
import type { AvailableField } from '../expr/expr-types'
import type { TrackerDisplayProps } from '../../types'
import type { FieldRuleV2, RuleProperty, EngineType } from '@/lib/field-rules-v2/types'
import { deriveEngineType } from '@/lib/field-rules-v2/types'

function createDefaultRule(): FieldRuleV2 {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    trigger: 'onMount',
    property: 'visibility',
    outcome: { op: 'const', value: true } as never,
    engineType: deriveEngineType('visibility'),
  }
}

interface FieldRulesV2TabProps {
  gridId: string
  fieldId: string
  fieldRulesV2: FieldRuleV2[]
  setFieldRulesV2: (rules: FieldRuleV2[]) => void
  availableFields: AvailableField[]
  currentTracker?: TrackerDisplayProps
  trackerSchemaId?: string | null
}

export function FieldRulesV2Tab({
  gridId,
  fieldId,
  fieldRulesV2,
  setFieldRulesV2,
  availableFields,
  currentTracker,
  trackerSchemaId,
}: FieldRulesV2TabProps) {
  function handleChange(index: number, updated: FieldRuleV2) {
    const next = [...fieldRulesV2]
    next[index] = updated
    setFieldRulesV2(next)
  }

  function handleRemove(index: number) {
    setFieldRulesV2(fieldRulesV2.filter((_, i) => i !== index))
  }

  function handleAdd() {
    setFieldRulesV2([...fieldRulesV2, createDefaultRule()])
  }

  if (fieldRulesV2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            theme.surface.subtle,
          )}
        >
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No rules yet</p>
          <p className="text-xs text-muted-foreground">
            Rules control field behavior — visibility, labels, required state, and more.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add first rule
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {fieldRulesV2.map((rule, index) => (
        <FieldRuleV2Card
          key={rule.id}
          rule={rule}
          gridId={gridId}
          fieldId={fieldId}
          availableFields={availableFields}
          currentTracker={currentTracker}
          trackerSchemaId={trackerSchemaId}
          onChange={(updated) => handleChange(index, updated)}
          onRemove={() => handleRemove(index)}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 gap-1.5 text-xs border-dashed"
        onClick={handleAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another rule
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/FieldRulesV2Tab.tsx
git commit -m "feat(field-rules-v2): add FieldRulesV2Tab component"
```

---

## Task 16: Wire FieldSettingsDialog and State

**Files:**
- Modify: `app/components/tracker-display/edit-mode/field-settings/useFieldSettingsState.ts`
- Modify: `app/components/tracker-display/edit-mode/field-settings/FieldSettingsDialog.tsx`
- Modify: `app/components/tracker-display/edit-mode/field-settings/types.ts`

- [ ] **Step 1: Add V2 state to `useFieldSettingsState.ts`**

Find the existing `const [fieldRules, setFieldRules] = useState` line. Immediately after it, add:
```typescript
const [fieldRulesV2, setFieldRulesV2] = useState<import('@/lib/field-rules-v2/types').FieldRuleV2[]>([])
```

In the `useEffect` that initializes state from `schema` (around line 350), after the `setFieldRules` call, add:
```typescript
const nextFieldRulesV2 = validationKey
  ? (schema?.fieldRulesV2?.[validationKey] ?? [])
  : []
setFieldRulesV2(nextFieldRulesV2 as import('@/lib/field-rules-v2/types').FieldRuleV2[])
```

In the `handleSave` callback (around line 697), after the `nextFieldRulesByTarget` block, add:
```typescript
const nextFieldRulesV2 = { ...(schema.fieldRulesV2 ?? {}) }
if (vKey) {
  if (fieldRulesV2.length > 0) {
    nextFieldRulesV2[vKey] = fieldRulesV2
  } else {
    delete nextFieldRulesV2[vKey]
  }
}
```

In the `onSchemaChange` call, add:
```typescript
  fieldRulesV2: Object.keys(nextFieldRulesV2).length > 0 ? nextFieldRulesV2 : undefined,
```

In the hook's return object, add:
```typescript
  fieldRulesV2,
  setFieldRulesV2,
```

- [ ] **Step 2: Add `'fieldRulesV2'` to allowed tabs type in `types.ts`**

In `app/components/tracker-display/edit-mode/field-settings/types.ts`, find the `allowedTabs` type and add `'fieldRulesV2'` to the union.

- [ ] **Step 3: Add tab to `FieldSettingsDialog.tsx`**

In the `resolvedAllowedTabs` default array (around line 45), add `'fieldRulesV2'`:
```typescript
  : ([
      'general',
      'validations',
      'calculations',
      'fieldRules',
      'fieldRulesV2',
      'bindings',
      'dynamicOptions',
    ] as const)
```

Import the new components and destructure from state:
```typescript
import { FieldRulesV2Tab } from './FieldRulesV2Tab'
// (Import Zap from lucide-react if not already imported)

// Destructure from state:
const { ..., fieldRulesV2, setFieldRulesV2 } = state
```

Add the tab trigger in the `TabsList` (after the existing `fieldRules` trigger):
```tsx
{resolvedAllowedTabs.includes('fieldRulesV2') && gridId && field && (
  <TabsTrigger value="fieldRulesV2" className="gap-1.5 text-xs">
    <Zap className="h-3.5 w-3.5" />
    <span>Rules V2</span>
    {fieldRulesV2.length > 0 && (
      <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-md bg-success/15 px-1 text-[10px] font-medium text-success">
        {fieldRulesV2.length}
      </span>
    )}
  </TabsTrigger>
)}
```

Add the tab content (after the existing `fieldRules` content):
```tsx
{resolvedAllowedTabs.includes('fieldRulesV2') && gridId && field && (
  <TabsContent value="fieldRulesV2" className="mt-0 flex-1 overflow-y-auto px-4 py-3">
    <FieldRulesV2Tab
      gridId={gridId}
      fieldId={field.id}
      fieldRulesV2={fieldRulesV2}
      setFieldRulesV2={setFieldRulesV2}
      availableFields={
        (props.availableFields as import('../expr/expr-types').AvailableField[] | undefined) ?? []
      }
      currentTracker={schema as import('../../types').TrackerDisplayProps}
      trackerSchemaId={trackerSchemaId}
    />
  </TabsContent>
)}
```

- [ ] **Step 4: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/components/tracker-display/edit-mode/field-settings/
git commit -m "feat(field-rules-v2): wire FieldSettingsDialog with V2 rules tab and state"
```

---

## Task 17: Run All Tests + Build

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```
Expected: all existing tests pass; new resolver + merge tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: 0 errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: 0 errors.

- [ ] **Step 4: Run build**

```bash
npm run build
```
Expected: successful build with no type errors.

---

## Verification

**End-to-end test (manual):**

1. Open a tracker in edit mode.
2. Open field settings for any field (e.g. a text field).
3. Confirm the "Rules V2" tab is visible in the dialog.
4. Click "Add first rule".
5. Set trigger: **On Load**, condition: none, property: **Required**, outcome JSON: `{"op":"const","value":true}`.
6. Save. Confirm the field now shows the required `*` indicator on tracker load.
7. Change the outcome to `{"op":"const","value":false}`. Save. Confirm `*` is gone.
8. Add a second rule: trigger **Field Change**, condition with `{"op":"eq","left":{"op":"field","fieldId":"<gridId>.<anotherFieldId>"},"right":{"op":"const","value":"yes"}}`, property **Show/Hide**, outcome `{"op":"const","value":false}`. Save.
9. In the tracker, change the watched field to "yes". Confirm the field hides.
10. Open field settings again. Confirm both rules are shown in the Rules V2 tab.
11. Delete one rule. Save. Confirm it's gone from the rule list.
12. Use the AI tab on the outcome editor: type "hide this field". Confirm a boolean expression is generated.
