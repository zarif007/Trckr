import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AddEntryButton({
 onClick,
 label = 'New Entry',
 ariaLabel = 'New entry',
 className,
}: {
 onClick: () => void
 label?: string
 ariaLabel?: string
 className?: string
}) {
 return (
 <Button
 size="sm"
 variant="outline"
 onClick={onClick}
 className={cn(
 // Subtle, toolbar-friendly button.
 'h-8 gap-1.5 px-3 text-xs font-medium',
 className
 )}
 aria-label={ariaLabel}
 title="Add New Entry"
 >
 <Plus className="h-4 w-4" />
 {label}
 </Button>
 )
}

