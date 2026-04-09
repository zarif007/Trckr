# Agent instructions (Cursor, Codex, Claude Code, etc.)

This repo’s product UI shares one **border chrome** system with outline buttons and inputs. Follow it for any new or edited components.

## UI border chrome (required)

1. Import `theme` from `@/lib/theme`.
2. For **floating surfaces** (dialog, popover, select/dropdown panel, toast shell): use `theme.uiChrome.floating` or `theme.patterns.floatingChrome` inside `cn(...)`.
3. For **only the border color** when you already have `border`, `border-b`, `border-r`, etc.: use `theme.uiChrome.border` (same as `theme.border.gridChrome`, i.e. `border-input`).
4. For **hover** on bordered controls: `theme.uiChrome.hover`.
5. For **Radix tab active** (or similar): `theme.uiChrome.tabActive`.
6. Prefer **`theme.patterns.card`**, **`theme.patterns.menuPanel`**, **`theme.patterns.inputBase`** instead of hand-rolled borders.

### Do not

- Do not use `border-border/20`, `border-border/50`, or other washed-out `border-border/*` for primary chrome next to toolbars or forms.
- Do not use a bare `border` without an explicit theme chrome class for product frames — rely on `theme.uiChrome` / `theme.patterns.*`.

Canonical module: `lib/theme/ui-chrome.ts`. Human-oriented rules also live in `CLAUDE.md` and `.cursor/rules/`.

## Other theming

- No shadows app-wide (`shadow-*`, `theme.shadow.*`).
- Radius: `theme.radius.md` for boxed UI.
- No raw Tailwind palette colors (`bg-gray-50`, etc.) — use `theme.*`.
