import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AddEntryButton } from '../components/AddEntryButton'
import type { EntryWayDefinition } from './entry-way-types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface EntryWayButtonProps {
  onNewEntryClick: () => void
  entryWays: EntryWayDefinition[]
  onSelectEntryWay: (way: EntryWayDefinition) => void
  disabled?: boolean
}

/**
 * Split button used for creating new entries:
 * - Left: normal “New Entry” button (opens dialog)
 * - Right: chevron that opens Entry Way shortcuts dropdown
 */
export function EntryWayButton({
  onNewEntryClick,
  entryWays,
  onSelectEntryWay,
  disabled,
}: EntryWayButtonProps) {
  return (
    <div className="inline-flex items-stretch rounded-md border border-border/70 bg-card/80 text-xs shadow-sm overflow-hidden">
      <AddEntryButton
        onClick={onNewEntryClick}
        className={cn(
          'h-8 rounded-none border-0 border-r border-border/60 bg-transparent hover:bg-muted/60',
          disabled && 'pointer-events-none opacity-60'
        )}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 w-8 px-0 rounded-none border-0 hover:bg-muted/60',
              disabled && 'pointer-events-none opacity-60'
            )}
            aria-label="Open Entry Way shortcuts"
            disabled={disabled}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 rounded-md border-border/60 p-1.5 text-xs">
          {entryWays.length === 0 ? (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
              No Entry Ways yet.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {entryWays.map((way) => (
                <button
                  key={way.id}
                  type="button"
                  className="flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => onSelectEntryWay(way)}
                >
                  <span className="font-medium text-foreground">{way.label}</span>
                  {way.description ? (
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {way.description}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

