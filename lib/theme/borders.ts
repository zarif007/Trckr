/**
 * Border color tokens (theme-aware via --border / --input).
 */
export const border = {
  default: 'border-border',
  /** Stronger frame (modals, emphasized inputs) */
  emphasis: 'border-border/80',
  subtle: 'border-border/60',
  subtleAlt: 'border-border/50',
  verySubtle: 'border-border/40',
  /** Section dividers, soft separators */
  divider: 'border-border/30',
  /** Same chroma as `divider`, for `ring-*` utilities */
  dividerRing: 'ring-border/30',
  faint: 'border-border/20',
  input: 'border-input',
  ring: 'border-ring',
  hover: 'hover:border-ring',
  divideSubtle: 'divide-border/60',
} as const
