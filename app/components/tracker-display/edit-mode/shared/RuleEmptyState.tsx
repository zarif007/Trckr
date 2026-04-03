'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

interface RuleEmptyStateProps {
 icon: React.ReactNode
 title: string
 description: string
 action?: {
 label: string
 onClick: () => void
 }
}

export function RuleEmptyState({ icon, title, description, action }: RuleEmptyStateProps) {
 return (
 <div className="flex flex-col items-center gap-3 py-8 px-4">
 <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', theme.surface.muted)}>
 {icon}
 </div>
 <div className="text-center space-y-1">
 <p className="text-sm font-medium">{title}</p>
 <p className="text-xs text-muted-foreground">{description}</p>
 </div>
 {action && (
 <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={action.onClick}>
 <Plus className="h-3.5 w-3.5" />
 {action.label}
 </Button>
 )}
 </div>
 )
}
