/** Default UI radius is `md` (see --radius in globals.css). Prefer `md` for all boxed UI. */
export const radius = {
  /** @deprecated Prefer `md` — app standard is one radius. */
  sm: 'rounded-sm',
  md: 'rounded-md',
  /** @deprecated Prefer `md` — app standard is one radius. */
  lg: 'rounded-lg',
  /** Circles only: spinners, ping ripples, or true circular affordances. */
  full: 'rounded-full',
} as const
