/** Default UI radius is `md` (see --radius in globals.css). Prefer `md` for all boxed UI. */
export const radius = {
  /**
   * ~16px controls (e.g. checkbox). Token `md` / `sm` can approach half the side when `--radius`
   * is large, which reads as circular — use a fixed small radius instead.
   */
  compact: "rounded-[5px]",
  /** @deprecated Prefer `md` — app standard is one radius. */
  sm: "rounded-sm",
  md: "rounded-sm",
  /** @deprecated Prefer `md` — app standard is one radius. */
  lg: "rounded-sm",
  /** Circles only: spinners, ping ripples, or true circular affordances. */
  full: "rounded-full",
} as const;
