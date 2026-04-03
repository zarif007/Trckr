'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

interface RuleCardShellProps {
 /** Icon shown at the left of the header */
 icon: React.ReactNode
 /** Badge row in the header (type/trigger/property badges + subtitle) */
 badges: React.ReactNode
 /** Right-side controls (enable checkbox, remove button). Clicks do NOT toggle expansion. */
 actions: React.ReactNode
 expanded: boolean
 onToggle: () => void
 /** Body content rendered when expanded */
 children: React.ReactNode
}

/**
 * Collapsible card shell shared by Calculations, Validations, and Field Rules V2 tabs.
 * Handles the expand/collapse toggle, chevron, and consistent border/radius chrome.
 * Actions are isolated from the toggle via stopPropagation.
 */
export function RuleCardShell({
 icon,
 badges,
 actions,
 expanded,
 onToggle,
 children,
}: RuleCardShellProps) {
 return (
 <div className={cn(theme.surface.card, theme.border.default, theme.radius.md, 'border overflow-hidden')}>
 <div
 className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
 onClick={onToggle}
 >
 <div className="shrink-0">{icon}</div>
 <div className="flex items-center gap-1.5 flex-1 min-w-0">{badges}</div>
 {/* stopPropagation so clicks on actions don't toggle the card */}
 <div
 className="flex items-center gap-2 shrink-0"
 onClick={(e) => e.stopPropagation()}
 >
 {actions}
 </div>
 <div className="text-muted-foreground shrink-0">
 {expanded ? (
 <ChevronDown className="h-3.5 w-3.5" />
 ) : (
 <ChevronRight className="h-3.5 w-3.5" />
 )}
 </div>
 </div>

 {expanded && (
 <div className={cn('px-3 pb-3 pt-3 border-t bg-primary/[0.02]', theme.border.verySubtle)}>
 {children}
 </div>
 )}
 </div>
 )
}
