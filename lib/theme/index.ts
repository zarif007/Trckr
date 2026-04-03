/**
 * Central theme schema — Tailwind class names backed by CSS variables in app/globals.css.
 *
 * import { theme } from '@/lib/theme'
 * className={cn(theme.surface.card, theme.border.subtle, theme.radius.md)}
 */

export { surface } from './surfaces'
export { border } from './borders'
export { radius } from './radius'
export { text } from './text'
export { shadow } from './shadow'
export { status } from './status'
export { patterns } from './patterns'
export { typography } from './typography'

import { border } from './borders'
import { patterns } from './patterns'
import { radius } from './radius'
import { shadow } from './shadow'
import { status } from './status'
import { surface } from './surfaces'
import { text } from './text'
import { typography } from './typography'

export const theme = {
 surface,
 text,
 border,
 shadow,
 radius,
 status,
 patterns,
 typography,
} as const

export type Theme = typeof theme
