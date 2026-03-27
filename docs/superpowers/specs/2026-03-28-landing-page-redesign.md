# Landing Page Redesign — Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Context

The current landing page has 7 sections but feels noisy and naive — too much text, weak visual hierarchy, and the platform's real capabilities (AI generation, calculations, bindings, validations, reports, analytics) are buried or shown only abstractly. The goal is a polished, top-tier AI startup feel: tight copy, maximum visual impact, zero gradients, same dark monochromatic color schema.

---

## Design Principles

- **No gradients.** Current color schema only: black background, white/gray text, `border-border/*` borders, theme surfaces.
- **Import from `@/lib/theme`** for all colors, surfaces, borders. No raw Tailwind color classes.
- **Less copy, more component.** Every section should show a real UI element or credible mini-visual. Text is support, not the star.
- **Tight headlines.** Max 6 words. Subtext max 2 lines.
- **Keep `LandingAxisFrame`.** It defines the visual language. Keep using it for all section cards.

---

## Page Structure (7 sections)

### §1 — Hero (keep + small tweak)

**File:** `app/components/landing-page/Hero.tsx`
**Change:** Subheadline only.

Current subheadline:
> "Describe what you track—AI builds it; your team works it; the analyst reads it."

New subheadline:
> "Describe it in plain language — AI builds the tracker, your team fills it, the analyst reads it."

Everything else — axis frame blueprint variant, animated badge, large type with inverted highlight, staggered motion, CTAs — stays exactly as-is.

---

### §2 — Platform overview (replaces "Real ops" + "One engine")

**Files to remove:** `Features.tsx`, `LandingPlatformPower.tsx` (both dropped from page)
**New file:** `Platform.tsx`

Replaces both `Features` and `LandingPlatformPower` with one clean 3-column section.

**Section heading:** `"One platform."` (small, muted overline above)
**Layout:** 3-column grid, each card uses `LandingAxisFrame` + `theme.surface.secondarySubtle`

**Three cards:**

| Column | Overline | Headline | Subtext | Visual |
|--------|----------|----------|---------|--------|
| Build | BUILD | Describe it. AI builds it. | Tabs, fields, views, master data — from one sentence. | `CapabilityVisual variant="aiBuild"` |
| Work | WORK | Table, kanban, or form. | Switch views. Drag rows. Edit inline. | `UseCaseVisual variant="table"` (or kanban) |
| Analyze | ANALYZE | Ask your data questions. | Built-in analyst. No SQL, no exports. | `CapabilityVisual variant="aiAnalyst"` |

Cards are larger than current `LandingPlatformPower` cards — give visuals more height (min ~80px visual area).

---

### §3 — Full product demo (keep + tighten intro)

**File:** `app/components/landing-page/Demo.tsx`
**Change:** Copy only. Component stays exactly as-is.

- Section title: `"Real UI"` → `"The full platform, live."`
- Subtitle: remove entirely (currently verbose multi-sentence description)
- Badge row above demo tabs: remove (Live, Formula, AST builder, Reports, Analysis, Bindings chips are redundant with the tabs themselves)

---

### §4 — Intelligence spotlight (new, replaces "Examples")

**File to remove:** `Examples.tsx` (dropped from page)
**New file:** `IntelligenceSpotlight.tsx`

**Layout:** Two-column split — copy left (40%), real component right (60%)
**Section overline:** `INTELLIGENCE`
**Headline:** `"Formulas, rules, and bindings — built visually."`
**Subtext:** `"Computed fields. Conditional show, require, and disable. Dropdowns backed by live grids. No code."`

**Right side:** Embed the existing `ExprFlowBuilder` component with a lightweight preset expression so it renders non-empty. Show it in a `LandingAxisFrame` card container.

If `ExprFlowBuilder` is too heavy to embed statically, use `CapabilityVisual` variants `calc`, `validate`, `master` in a stacked 3-row layout instead, each with a 1-line label.

**Motion:** `whileInView` fade-in, copy and component stagger slightly.

---

### §5 — Analytics spotlight (new)

**New file:** `AnalyticsSpotlight.tsx`

**Layout:** Two-column split — real component left (60%), copy right (40%)
*(Alternated from §4 for visual rhythm)*

**Section overline:** `ANALYST`
**Headline:** `"Your data already knows the answers."`
**Subtext:** `"Ask plain questions. Get summaries, trends, and suggestions — grounded in your actual rows."`

**Left side:** Render `AnalysisDocumentView` (or `ReportRecipeFilters`) with landing demo data in a `LandingAxisFrame` card container. Use existing `landing-demo-insights.ts` data.

---

### §6 — How it works (simplify Protocol: 5 steps → 3)

**File:** `app/components/landing-page/Protocol.tsx`
**Change:** Reduce to 3 steps, remove icons, simplify layout.

| Step | Headline | Subtext |
|------|----------|---------|
| 1 | Describe | Write what you track in plain language. |
| 2 | AI builds | Schema, tabs, views, and field logic — generated. |
| 3 | Run & ask | Your team works it. The analyst reads it. |

Remove the desktop timeline spine and icons. Use clean numbered list with step number, bold headline, 1-line subtext. Horizontal layout on desktop, vertical on mobile.

---

### §7 — CTA (keep as-is)

**File:** `app/components/landing-page/CTA.tsx`
**Change:** None.

---

## Page Assembly Changes

**File:** `app/page.tsx`

Remove `Features` and `Examples` imports. Add `Platform`, `IntelligenceSpotlight`, `AnalyticsSpotlight`.

New order:
```tsx
<Hero />
<section className="...">
  <Platform />
  <Demo />
  <IntelligenceSpotlight />
  <AnalyticsSpotlight />
  <Protocol />
  <CTA />
</section>
```

---

## Files Changed / Created

| File | Action |
|------|--------|
| `app/components/landing-page/Hero.tsx` | Edit — subheadline only |
| `app/components/landing-page/Demo.tsx` | Edit — strip verbose intro, remove badge row |
| `app/components/landing-page/Protocol.tsx` | Edit — 5 steps → 3, remove icons/spine |
| `app/components/landing-page/Platform.tsx` | Create — replaces Features + LandingPlatformPower |
| `app/components/landing-page/IntelligenceSpotlight.tsx` | Create — replaces Examples |
| `app/components/landing-page/AnalyticsSpotlight.tsx` | Create — new section |
| `app/components/landing-page/Features.tsx` | Delete (no longer used) |
| `app/components/landing-page/LandingPlatformPower.tsx` | Delete (no longer used) |
| `app/components/landing-page/Examples.tsx` | Delete (no longer used) |
| `app/page.tsx` | Edit — update imports and section order |

---

## Verification

1. Run `npm run dev`, open `localhost:3000`
2. Check each section renders with correct layout and no raw color classes
3. Confirm `ExprFlowBuilder` (or fallback `CapabilityVisual`) renders non-empty in §4
4. Confirm `AnalysisDocumentView` renders with landing demo data in §5
5. Run `npm run lint && npm run typecheck` — no errors
6. Check dark mode: all surfaces use theme tokens, nothing looks broken
