/**
 * Surface (background) tokens — values come from globals.css; these are Tailwind class names only.
 */
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
 /** Landing / hero panel — tuned per mode */
 secondaryHero: 'bg-secondary/25 dark:bg-secondary/20',
 /** Softer secondary fill (landing cards) */
 secondarySoft: 'bg-secondary/25',
 /** CTA / glassy panel over grid */
 ctaWash: 'bg-background/40 dark:bg-background/25',
 /** Horizontal rules, connector lines */
 mutedLine: 'bg-border/60',
 /** Outline badges on tinted panels */
 badgeWash: 'bg-background/50',
 /** Popovers, dropdowns */
 popover: 'bg-popover',
 /** Form inputs (transparent with dark override) */
 input: 'bg-transparent dark:bg-input/30',
 /** Overlay backdrop */
 overlay: 'bg-black/50',
 /** Lighter muted fill — for cards, section bars */
 subtle: 'bg-muted/20',
 /** Card with visible frame — subtle depth without shadow */
 elevated: 'bg-card border border-border/40',
 /** Floating glass panel — for toolbars, popovers */
 glass: 'bg-background/80 backdrop-blur-md border border-border/30',
 /** Active / selected state — high contrast inverted */
 active: 'bg-foreground text-background',
} as const
