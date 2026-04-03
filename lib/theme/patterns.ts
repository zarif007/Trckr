import { border } from './borders'
import { radius } from './radius'
import { surface } from './surfaces'
import { text } from './text'

export const patterns = {
  inputBase: [
    'input-field-height',
    border.input,
    border.hover,
    'focus-visible:border-ring',
    radius.md,
    'border',
    surface.input,
    'transition-[color,box-shadow] outline-none ring-0 focus:ring-0 focus-visible:ring-0',
  ].join(' '),
  card: ['bg-card', text.card, radius.md, 'border', 'py-6'].join(' '),
  interactive: 'transition-colors hover:bg-muted cursor-pointer',
  hoverPrimary: 'hover:bg-primary/10 hover:text-primary',
  /** Button `outline` variant — same border/input story as form fields */
  outlineButton: [
    'border',
    border.input,
    'bg-background dark:bg-input/30',
    'hover:bg-accent hover:text-accent-foreground',
    'dark:hover:bg-input/50',
  ].join(' '),
  /** Fixed context / account menu shell (portal menus) */
  menuPanel: [
    'fixed z-[100] min-w-[192px] border bg-popover text-popover-foreground shadow-lg py-1 animate-in fade-in-0 zoom-in-95',
    radius.md,
  ].join(' '),
  /** Full-width row inside portal menus; use `cn(..., 'py-2')` when a taller hit target is needed */
  menuItem: [
    'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/80',
    radius.md,
  ].join(' '),
  /** Floating panel shell — glass surface for standalone containers */
  panelShell: [
    'bg-background/60 backdrop-blur-sm border rounded-md',
    border.subtle,
    radius.md,
  ].join(' '),
  /** Horizontal divider — thin, subtle, intentional */
  separatorLine: ['h-px bg-border/20 my-3'].join(' '),
} as const
