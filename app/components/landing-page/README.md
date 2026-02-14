# Landing page components

Sections used on the **marketing/landing** page. Each file is a self-contained section (Hero, Demo, Features, etc.) that composes shared UI from `@/components/ui`.

## Role

- Present marketing content and demo.
- No tracker state or API logic; use props/callbacks if the page needs to pass data.

## Files

| File | Purpose |
|------|--------|
| Hero.tsx | Hero section (headline, CTA) |
| Demo.tsx | Demo / TrackerDisplay preview |
| Protocol.tsx | Protocol section |
| Features.tsx | Feature list / badges |
| Examples.tsx | Examples section |
| CTA.tsx | Call-to-action block |

## Usage

Import from the page that renders the landing route (e.g. `app/page.tsx`) and compose these sections. Use `@/components/ui` for buttons, badges, etc.
