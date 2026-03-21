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
} as const
