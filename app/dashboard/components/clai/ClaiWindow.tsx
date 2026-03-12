'use client'

import { Rnd } from 'react-rnd'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClaiPanel } from './ClaiPanel'
import type { ClaiInstance } from './types'

const TAB_BAR_HANDLE = 'clai-tab-bar'

export interface ClaiWindowProps {
  instances: ClaiInstance[]
  activeId: string
  onActiveIdChange: (id: string) => void
  onAddTab: () => void
  onCloseTab: (id: string) => void
  onCloseWindow: () => void
  onSubmit: (instanceId: string, value: string) => void
  /** Current location (live pathname) for the active tab's prompt */
  currentLocation: string
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  onPositionChange?: (x: number, y: number) => void
  onSizeChange?: (width: number, height: number) => void
  className?: string
}

const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 420
const MIN_WIDTH = 400
const MIN_HEIGHT = 300
const MAX_WIDTH = 1200
const MAX_HEIGHT = 800

function formatTabLabel(instance: ClaiInstance, index: number): string {
  const path = instance.location.replace(/^\/+|\/+$/g, '') || 'dashboard'
  if (path === 'dashboard') return `~`
  const parts = path.split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : path
}

export function ClaiWindow({
  instances,
  activeId,
  onActiveIdChange,
  onAddTab,
  onCloseTab,
  onCloseWindow,
  onSubmit,
  currentLocation,
  position,
  size,
  onPositionChange,
  onSizeChange,
  className,
}: ClaiWindowProps) {
  const activeInstance = instances.find((i) => i.id === activeId)
  const canCloseTab = instances.length > 1

  const handleSubmit = (value: string) => {
    onSubmit(activeId, value)
  }

  return (
    <Rnd
      default={{
        x: typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - DEFAULT_WIDTH) / 2) : 0,
        y: typeof window !== 'undefined' ? Math.max(0, (window.innerHeight - DEFAULT_HEIGHT) / 2) : 0,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      }}
      position={position}
      size={size}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      maxWidth={MAX_WIDTH}
      maxHeight={MAX_HEIGHT}
      dragHandleClassName={TAB_BAR_HANDLE}
      enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
      onDragStop={(_e, d) => onPositionChange?.(d.x, d.y)}
      onResizeStop={(_e, _dir, el) => onSizeChange?.(el.offsetWidth, el.offsetHeight)}
      className={cn(
        '!z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
        className
      )}
      style={{ zIndex: 50 }}
    >
      <div
        className={cn(
          TAB_BAR_HANDLE,
          'flex-shrink-0 flex items-stretch cursor-grab active:cursor-grabbing',
          'border-b border-border bg-muted/90'
        )}
      >
        <div className="flex flex-1 min-w-0 items-center gap-px overflow-x-auto">
          {instances.map((inst, index) => {
            const isActive = inst.id === activeId
            const label = formatTabLabel(inst, index)
            return (
              <div
                key={inst.id}
                className={cn(
                  'group flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-t-md border-b-2 transition-colors',
                  isActive
                    ? 'bg-background border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground/80'
                )}
              >
                <button
                  type="button"
                  className="min-w-0 truncate text-left text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                  onClick={() => onActiveIdChange(inst.id)}
                  title={inst.location || 'dashboard'}
                >
                  {label}
                </button>
                {canCloseTab && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(inst.id)
                    }}
                    aria-label={`Close tab ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
          <button
            type="button"
            className="shrink-0 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={onAddTab}
            aria-label="New tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          onClick={onCloseWindow}
          aria-label="Close CLAI"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-b-xl">
        {activeInstance && (
          <ClaiPanel
            lines={activeInstance.lines}
            location={currentLocation}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </Rnd>
  )
}
