/**
 * Reusable UI border chrome — same visual language as `Button variant="outline"`
 * and `theme.patterns.inputBase` (`border-input` / `--input`).
 *
 * **Use this for:** dialogs, popovers, menus, cards, tabs, tables, kanban, toasts,
 * section bars, and any bordered panel that should match toolbar + form controls.
 *
 * **Do not use** ad-hoc `border-border/20`, `border-border/50`, etc. for that
 * chrome — opacity makes borders look wrong next to outline buttons.
 *
 * Import either `theme.uiChrome` or individual tokens from `theme.border` /
 * `theme.patterns` (they reference the same underlying classes).
 */
import { border } from "./borders";
import { patterns } from "./patterns";

export const uiChrome = {
  /** Solid border color (`border-input`) — pair with `border`, `border-b`, `border-r`, etc. */
  border: border.gridChrome,
  hover: border.gridChromeHover,
  /** Drag overlays / de-emphasized frames only */
  soft: border.gridChromeSoft,
  /** Radix `TabsTrigger` and similar: `data-[state=active]:border-input` */
  tabActive: border.dataStateActiveChrome,
  /** `border` + chrome color — floating layers (dialog, popover, select content) */
  floating: patterns.floatingChrome,
  outlineButton: patterns.outlineButton,
  card: patterns.card,
  menuPanel: patterns.menuPanel,
  panelShell: patterns.panelShell,
  inputBase: patterns.inputBase,
} as const;

export type UiChrome = typeof uiChrome;
