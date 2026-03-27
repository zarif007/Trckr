# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign landing page from 7 noisy sections into a tight Spotlight layout — less copy, real components front and center, same dark monochromatic theme.

**Architecture:** Keep Hero and CTA unchanged. Create three new components (Platform, IntelligenceSpotlight, AnalyticsSpotlight). Edit Demo and Protocol for tighter copy. Delete Features, LandingPlatformPower, Examples. Update page.tsx section order.

**Tech Stack:** Next.js App Router, Tailwind CSS, Framer Motion, `@/lib/theme` for all colors, `LandingAxisFrame` for visual language.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/components/landing-page/Hero.tsx` | Edit | One subheadline text change |
| `app/components/landing-page/Demo.tsx` | Edit | Remove title, subtitle, badge row |
| `app/components/landing-page/Protocol.tsx` | Rewrite | 5 steps → 3 clean numbered cards |
| `app/components/landing-page/landing-mini-visuals.tsx` | Edit | Add optional `className` prop to `CapabilityVisual` and `UseCaseVisual` |
| `app/components/landing-page/Platform.tsx` | Create | 3-column Build / Work / Analyze section |
| `app/components/landing-page/IntelligenceSpotlight.tsx` | Create | ExprFlowBuilder spotlight section |
| `app/components/landing-page/AnalyticsSpotlight.tsx` | Create | AnalysisDocumentView spotlight section |
| `app/page.tsx` | Edit | Update imports and section order |
| `app/components/landing-page/Features.tsx` | Delete | No longer used |
| `app/components/landing-page/LandingPlatformPower.tsx` | Delete | No longer used |
| `app/components/landing-page/Examples.tsx` | Delete | No longer used |

---

## Task 1: Tweak Hero subheadline

**Files:**
- Modify: `app/components/landing-page/Hero.tsx:80`

- [ ] **Step 1: Edit the subheadline**

In `Hero.tsx`, find line 80. Replace:

```tsx
              Describe what you track—AI builds it; your team works it; the analyst
              reads it.
```

With:

```tsx
              Describe it in plain language — AI builds the tracker, your team fills
              it, the analyst reads it.
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — should pass with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing-page/Hero.tsx
git commit -m "copy: tighten hero subheadline rhythm"
```

---

## Task 2: Clean up Demo section header

**Files:**
- Modify: `app/components/landing-page/Demo.tsx`

- [ ] **Step 1: Remove DEMO_BADGES constant**

In `Demo.tsx`, delete lines 33–40:

```tsx
const DEMO_BADGES = [
  'Live',
  'Formula',
  'AST builder',
  'Reports',
  'Analysis',
  'Bindings',
] as const
```

- [ ] **Step 2: Replace the section header JSX**

Find the entire two-column header block inside `<div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">` — it starts with:

```tsx
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="text-center sm:text-left space-y-1 sm:min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Real UI
            </h3>
            <p className="text-muted-foreground text-[11px] sm:text-xs font-medium leading-snug max-w-xl">
              Switch between the embedded tracker, the visual expression builder (calculations &
              validations), and the same report and analysis surfaces as the signed-in app.
            </p>
          </div>
          <div
            className="flex flex-wrap justify-center sm:justify-end gap-1 shrink-0"
            aria-hidden
          >
            {DEMO_BADGES.map((label) => (
              <span
                key={label}
                className={cn(
                  'rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  theme.border.subtle,
                  'bg-background/90 text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
```

Replace the entire block with:

```tsx
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          The full platform, live.
        </h3>
```

- [ ] **Step 3: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/landing-page/Demo.tsx
git commit -m "copy: strip Demo verbose header and badge row"
```

---

## Task 3: Add className prop to mini-visuals

**Files:**
- Modify: `app/components/landing-page/landing-mini-visuals.tsx`

This lets Platform cards render taller visuals.

- [ ] **Step 1: Update UseCaseVisual**

Replace the `UseCaseVisual` function signature and all three return values:

```tsx
export function UseCaseVisual({
  variant,
  className,
}: {
  variant: 'table' | 'kanban' | 'inbox'
  className?: string
}) {
  if (variant === 'kanban') {
    return (
      <div className={cn('flex gap-1 p-2 h-[4.25rem]', frame, className)} aria-hidden>
        {[0.4, 0.55, 0.35].map((w, i) => (
          <div
            key={i}
            className="flex flex-1 flex-col gap-1 rounded border bg-background/60 p-1 min-w-0"
          >
            <div className="h-1 w-2/3 rounded-sm bg-foreground/12" />
            <div
              className="mt-auto h-6 rounded-sm bg-foreground/12 border border-border/60"
              style={{ width: `${w * 100}%` }}
            />
          </div>
        ))}
      </div>
    )
  }
  if (variant === 'inbox') {
    return (
      <div className={cn('space-y-1.5 p-2 h-[4.25rem]', frame, className)} aria-hidden>
        {[0.92, 0.78, 0.85].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
            <div
              className="h-2 rounded-sm bg-foreground/10"
              style={{ width: `${w * 100}%` }}
            />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('space-y-1.5 p-2 h-[4.25rem]', frame, className)} aria-hidden>
      {[0.95, 0.72, 0.88, 0.65].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 rounded-sm bg-foreground/10"
            style={{ width: `${w * 100}%` }}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update CapabilityVisual**

Replace the `CapabilityVisual` function signature. Add `className?: string` to props and append it in the `cn()` call of every returned outer div. The `h` variable value stays the same — tailwind-merge will resolve height conflicts when `className` overrides it.

Replace the function signature line:

```tsx
export function CapabilityVisual({
  variant,
}: {
  variant:
    | 'aiBuild'
    | 'aiAnalyst'
    | 'editor'
    | 'drag'
    | 'calc'
    | 'validate'
    | 'master'
    | 'report'
}) {
```

With:

```tsx
export function CapabilityVisual({
  variant,
  className,
}: {
  variant:
    | 'aiBuild'
    | 'aiAnalyst'
    | 'editor'
    | 'drag'
    | 'calc'
    | 'validate'
    | 'master'
    | 'report'
  className?: string
}) {
```

Then for every variant's outermost div, append `, className` to its `cn()` call. Each variant has one outer div. For example `aiBuild`:

```tsx
  if (variant === 'aiBuild') {
    return (
      <div className={cn('flex gap-1.5 p-2', frame, h, className)} aria-hidden>
```

Do the same for every other variant (aiAnalyst, editor, drag, calc, validate, master, report). The final `report` fallback return is:

```tsx
  return (
    <div className={cn('p-2 flex flex-col gap-1', frame, h, className)} aria-hidden>
```

- [ ] **Step 3: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/landing-page/landing-mini-visuals.tsx
git commit -m "feat: add optional className to CapabilityVisual and UseCaseVisual"
```

---

## Task 4: Create Platform section

**Files:**
- Create: `app/components/landing-page/Platform.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import {
  CapabilityVisual,
  UseCaseVisual,
} from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const PILLARS: {
  overline: string
  title: string
  body: string
  visual: React.ReactNode
}[] = [
  {
    overline: 'Build',
    title: 'Describe it. AI builds it.',
    body: 'Tabs, fields, views, master data — from one sentence.',
    visual: <CapabilityVisual variant="aiBuild" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Work',
    title: 'Table, kanban, or form.',
    body: 'Switch views. Drag rows. Edit inline.',
    visual: <UseCaseVisual variant="table" className="h-20 sm:h-24" />,
  },
  {
    overline: 'Analyze',
    title: 'Ask your data questions.',
    body: 'Built-in analyst. No SQL, no exports.',
    visual: <CapabilityVisual variant="aiAnalyst" className="h-20 sm:h-24" />,
  },
]

export default function Platform() {
  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
        One platform.
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {PILLARS.map((pillar, idx) => (
          <motion.div
            key={pillar.overline}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex h-full flex-col gap-3 p-4 sm:p-5'
              )}
            >
              {pillar.visual}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {pillar.overline}
                </p>
                <h4 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                  {pillar.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {pillar.body}
                </p>
              </div>
            </LandingAxisFrame>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing-page/Platform.tsx
git commit -m "feat: add Platform section (Build / Work / Analyze)"
```

---

## Task 5: Create IntelligenceSpotlight section

**Files:**
- Create: `app/components/landing-page/IntelligenceSpotlight.tsx`

This embeds the live `ExprFlowBuilder` component using the same demo data as `Demo.tsx`.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExprFlowBuilder } from '@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder'
import {
  LANDING_DEMO_EXPR_FIELDS,
  LANDING_DEMO_INITIAL_EXPR,
} from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import type { ExprNode } from '@/lib/functions/types'

export default function IntelligenceSpotlight() {
  const [expr, setExpr] = useState<ExprNode>(LANDING_DEMO_INITIAL_EXPR)

  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        {/* Copy */}
        <motion.div
          className="lg:col-span-2 space-y-3 lg:pt-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Intelligence
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            Formulas, rules, and bindings — built visually.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Computed fields. Conditional show, require, and disable. Dropdowns backed by live grids. No code.
          </p>
        </motion.div>

        {/* Component */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div
            className={cn(
              'rounded-md overflow-hidden border bg-background',
              theme.border.subtle
            )}
          >
            <ExprFlowBuilder
              key="intelligence-spotlight"
              expr={expr}
              availableFields={LANDING_DEMO_EXPR_FIELDS}
              onChange={setExpr}
              resultFieldId="logic_lines_grid.logic_line_total"
              resultFieldLabel="Line total"
              flowHeightClassName="h-[min(36vh,360px)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing-page/IntelligenceSpotlight.tsx
git commit -m "feat: add IntelligenceSpotlight section with live ExprFlowBuilder"
```

---

## Task 6: Create AnalyticsSpotlight section

**Files:**
- Create: `app/components/landing-page/AnalyticsSpotlight.tsx`

This embeds the live `AnalysisDocumentView` using existing landing demo data.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { motion } from 'framer-motion'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import { LANDING_DEMO_ANALYSIS_DOCUMENT } from '@/app/components/landing-page/landing-demo-insights'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function AnalyticsSpotlight() {
  return (
    <motion.section
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        {/* Component (left) */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div
            className={cn(
              'rounded-md border bg-background max-h-[min(60vh,540px)] overflow-y-auto',
              theme.border.subtle
            )}
          >
            <AnalysisDocumentView
              document={LANDING_DEMO_ANALYSIS_DOCUMENT}
              header={{
                title: 'Pipeline concentration',
                asOfIso: null,
                projectName: 'Demo org',
                moduleName: 'Go-to-market',
                trackerName: 'Project pipeline',
              }}
            />
          </div>
        </motion.div>

        {/* Copy (right) */}
        <motion.div
          className="lg:col-span-2 space-y-3 lg:pt-3"
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Analyst
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            Your data already knows the answers.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ask plain questions. Get summaries, trends, and suggestions — grounded in your actual rows.
          </p>
        </motion.div>
      </div>
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing-page/AnalyticsSpotlight.tsx
git commit -m "feat: add AnalyticsSpotlight section with live AnalysisDocumentView"
```

---

## Task 7: Simplify Protocol to 3 steps

**Files:**
- Modify: `app/components/landing-page/Protocol.tsx`

Full rewrite — remove icons, timeline spine, Examples button. 5 steps → 3 numbered cards.

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client'

import { motion } from 'framer-motion'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

const STEPS = [
  {
    num: '01',
    title: 'Describe',
    body: 'Write what you track in plain language.',
  },
  {
    num: '02',
    title: 'AI builds',
    body: 'Schema, tabs, views, and field logic — generated.',
  },
  {
    num: '03',
    title: 'Run & ask',
    body: 'Your team works it. The analyst reads it.',
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-4 sm:space-y-5"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        How it works
      </h3>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 list-none p-0 m-0">
        {STEPS.map((step, idx) => (
          <motion.li
            key={step.num}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex h-full flex-col gap-3 p-4 sm:p-5'
              )}
            >
              <span className="text-[11px] font-bold tabular-nums tracking-widest text-muted-foreground/50">
                {step.num}
              </span>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {step.body}
                </p>
              </div>
            </LandingAxisFrame>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/landing-page/Protocol.tsx
git commit -m "refactor: simplify Protocol from 5 icon steps to 3 numbered cards"
```

---

## Task 8: Update page.tsx

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client'

import Hero from './components/landing-page/Hero'
import Platform from './components/landing-page/Platform'
import Demo from './components/landing-page/Demo'
import IntelligenceSpotlight from './components/landing-page/IntelligenceSpotlight'
import AnalyticsSpotlight from './components/landing-page/AnalyticsSpotlight'
import Protocol from './components/landing-page/Protocol'
import CTA from './components/landing-page/CTA'

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans bg-background selection:bg-muted selection:text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-[0.06] dark:opacity-[0.11]"
      />
      <div className="relative z-10 max-w-full mx-auto px-0 py-0 space-y-16 md:space-y-24">
        <Hero />

        <section className='max-w-7xl mx-auto flex flex-col space-y-10 border-t border-border/35 px-4 pt-10 sm:space-y-12 sm:pt-12 md:space-y-14 md:px-4 md:pt-16 lg:space-y-20'>
          <Platform />
          <Demo />
          <IntelligenceSpotlight />
          <AnalyticsSpotlight />
          <Protocol />
          <CTA />
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck` — no errors.
Run `npm run lint` — no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "refactor: update landing page section order with new spotlight sections"
```

---

## Task 9: Delete unused components

**Files:**
- Delete: `app/components/landing-page/Features.tsx`
- Delete: `app/components/landing-page/LandingPlatformPower.tsx`
- Delete: `app/components/landing-page/Examples.tsx`

- [ ] **Step 1: Delete the three files**

```bash
rm app/components/landing-page/Features.tsx
rm app/components/landing-page/LandingPlatformPower.tsx
rm app/components/landing-page/Examples.tsx
```

- [ ] **Step 2: Verify nothing imports them**

```bash
grep -r "Features\|LandingPlatformPower\|Examples" app/components/landing-page/ app/page.tsx
```

Expected: no output (no remaining imports).

- [ ] **Step 3: Verify build**

Run `npm run typecheck` and `npm run lint` — both pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Features, LandingPlatformPower, and Examples (replaced by Platform and spotlight sections)"
```

---

## Task 10: Final visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 2: Check each section**

Walk down the page and verify:

1. **Hero** — unchanged, subheadline reads "Describe it in plain language…"
2. **Platform** — 3 cards side by side: Build / Work / Analyze, each with a taller visual, overline label, title, and body text
3. **Demo** — heading is "The full platform, live.", no badges row, tabs still work (Tracker / Expressions / Report / Analysis)
4. **IntelligenceSpotlight** — "Intelligence" overline, formula headline, ExprFlowBuilder renders on the right
5. **AnalyticsSpotlight** — AnalysisDocumentView renders on the left, "Analyst" overline + copy on the right
6. **Protocol** — "How it works", 3 numbered cards (01, 02, 03), no icons
7. **CTA** — unchanged

- [ ] **Step 3: Check no raw color classes**

Confirm no section uses raw Tailwind color classes (e.g. `bg-zinc-900`, `text-gray-400`). All surfaces use `theme.*` tokens or `bg-background`, `text-muted-foreground`, `border-border/*`.

- [ ] **Step 4: Run quality gates**

```bash
npm run lint && npm run typecheck
```

Expected: both pass with no errors.

---

## Self-Review Notes

- **Spec coverage:** All 7 spec sections covered. Hero (Task 1), Demo (Task 2), Platform (Task 4), IntelligenceSpotlight (Task 5), AnalyticsSpotlight (Task 6), Protocol (Task 7), page.tsx wiring (Task 8). Files deleted (Task 9).
- **No placeholders:** All code is complete and copy-paste ready.
- **Type consistency:** `ExprNode` imported from `@/lib/functions/types` in Task 5 — same import as `Demo.tsx`. `LANDING_DEMO_ANALYSIS_DOCUMENT`, `LANDING_DEMO_EXPR_FIELDS`, `LANDING_DEMO_INITIAL_EXPR` all from `landing-demo-insights` — same source as `Demo.tsx`.
- **Visual className override:** Tasks 3 and 4 are paired — Task 3 adds the `className` prop, Task 4 uses `h-20 sm:h-24` via it. Do Task 3 before Task 4.
