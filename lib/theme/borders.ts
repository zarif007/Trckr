/**
 * Border color tokens (theme-aware via --border / --input).
 */
export const border = {
  default: "border-border",
  /** Stronger frame (modals, emphasized inputs) */
  emphasis: "border-border/80",
  subtle: "border-border/60",
  subtleAlt: "border-border/50",
  verySubtle: "border-border/40",
  /** Section dividers, soft separators */
  divider: "border-border/30",
  /** Same chroma as `divider`, for `ring-*` utilities */
  dividerRing: "ring-border/30",
  faint: "border-border/20",
  /** Form controls; same token as `gridChrome` / outline buttons. */
  input: "border-input",
  /**
   * Same solid border color as `Button variant="outline"` / New Entry (`border-input`).
   * Do not use opacity modifiers here — those read as a different color next to the toolbar.
   */
  gridChrome: "border-input",
  gridChromeHover: "hover:border-ring",
  /** Drag overlay — same hue as outline buttons, slightly softer */
  gridChromeSoft: "border-input/55",
  /** Radix-style active state — same border color as outline controls */
  dataStateActiveChrome: "data-[state=active]:border-input",
  ring: "border-ring",
  hover: "hover:border-ring",
  divideSubtle: "divide-border/60",
  /** Barely-visible separator — for dense lists, dividers */
  hairline: "border-border/15",
  /** Subtle ring for active/focus states */
  activeRing: "ring-1 ring-foreground/8",
} as const;
