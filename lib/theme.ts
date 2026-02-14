/**
 * Central theme schema – single source of truth for colors, surfaces, borders, shadows, and radius.
 * Import from here so every component uses the same tokens. No hardcoded color classes elsewhere.
 *
 * Usage:
 *   import { theme } from '@/lib/theme'
 *   className={cn(theme.surface.card, theme.border.default, theme.shadow.sm)}
 */

// =============================================================================
// Surfaces (backgrounds)
// =============================================================================

export const surface = {
  /** Page/app background */
  background: 'bg-background',
  /** Cards, elevated surfaces */
  card: 'bg-card',
  /** Muted surfaces (tabs list, table header, etc.) */
  muted: 'bg-muted',
  mutedSubtle: 'bg-muted/50',
  mutedHover: 'hover:bg-muted',
  /** Secondary surfaces */
  secondary: 'bg-secondary',
  secondarySubtle: 'bg-secondary/30',
  secondaryLight: 'bg-secondary/20',
  /** Popovers, dropdowns */
  popover: 'bg-popover',
  /** Form inputs (transparent with dark override) */
  input: 'bg-transparent dark:bg-input/30',
  /** Overlay backdrop */
  overlay: 'bg-black/50',
} as const

// =============================================================================
// Text colors
// =============================================================================

export const text = {
  foreground: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  card: 'text-card-foreground',
  /** Status / semantic */
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
} as const

// =============================================================================
// Borders
// =============================================================================

export const border = {
  default: 'border-border',
  subtle: 'border-border/60',
  subtleAlt: 'border-border/50',
  verySubtle: 'border-border/40',
  faint: 'border-border/20',
  input: 'border-input',
  ring: 'border-ring',
  /** Hover state for interactive borders */
  hover: 'hover:border-ring',
} as const

// =============================================================================
// Shadows (disabled – no shadows used in app)
// =============================================================================

export const shadow = {
  xs: '',
  sm: '',
  md: '',
  lg: '',
  xl: '',
} as const

// =============================================================================
// Radius
// =============================================================================

export const radius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
} as const

// =============================================================================
// Status colors (for alerts, badges, indicators)
// =============================================================================

export const status = {
  success: {
    bg: 'bg-success/10',
    border: 'border-success/60',
    text: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/50',
    text: 'text-warning',
  },
  destructive: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/50',
    text: 'text-destructive',
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/60',
    text: 'text-info',
  },
} as const

// =============================================================================
// Compound patterns – common combinations
// =============================================================================

export const patterns = {
  /** Base form field: border, focus, radius */
  inputBase:
    'input-field-height border-input hover:border-ring focus-visible:border-ring rounded-md border bg-transparent transition-[color,box-shadow] outline-none ring-0 focus:ring-0 focus-visible:ring-0 dark:bg-input/30',
  /** Card with border */
  card: 'bg-card text-card-foreground rounded-md border py-6',
  /** Clickable surface with hover */
  interactive: 'transition-colors hover:bg-muted cursor-pointer',
  /** Primary emphasis hover */
  hoverPrimary: 'hover:bg-primary/10 hover:text-primary',
} as const

// =============================================================================
// Unified theme object (for destructuring or spreading)
// =============================================================================

export const theme = {
  surface,
  text,
  border,
  shadow,
  radius,
  status,
  patterns,
} as const

export type Theme = typeof theme
