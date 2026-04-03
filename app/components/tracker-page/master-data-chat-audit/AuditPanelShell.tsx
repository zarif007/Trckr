'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

interface AuditPanelShellProps {
 title: string
 icon: LucideIcon
 children: ReactNode
 className?: string
}

/** Shared chrome for function-call and created-tracker panels (matches `ToolCallProgress` styling). */
export function AuditPanelShell({ title, icon: Icon, children, className }: AuditPanelShellProps) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 4 }}
 animate={{ opacity: 1, y: 0 }}
 className={cn(
 'min-w-0 w-full space-y-2.5 border bg-muted/30 p-3',
 theme.radius.md,
 theme.border.divider,
 className,
 )}
 >
 <div className="flex items-center gap-2">
 <Icon className="h-3.5 w-3.5 text-muted-foreground" />
 <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
 {title}
 </span>
 </div>
 {children}
 </motion.div>
 )
}
