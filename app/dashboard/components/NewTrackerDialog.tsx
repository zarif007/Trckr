'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FilePlus, GitBranch, Layers, Info, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NewTrackerDialogProps {
  projectId?: string
  moduleId?: string
  trigger?: React.ReactNode
  onCreated?: (trackerId: string) => void
  onError?: (msg: string) => void
}

type InstanceType = 'SINGLE' | 'MULTI'

const INSTANCE_OPTIONS: Array<{
  value: InstanceType
  label: string
  icon: typeof FileText
  description: string
}> = [
  {
    value: 'SINGLE',
    label: 'Single',
    icon: FileText,
    description: 'One shared tracker with a single dataset. Supports optional version control with branches, diffs, and merging.',
  },
  {
    value: 'MULTI',
    label: 'Multi',
    icon: Layers,
    description: 'Multiple independent instances of this tracker, each with its own data, author, and timestamp.',
  },
]

export function NewTrackerDialog({
  projectId,
  moduleId,
  trigger,
  onCreated,
  onError,
}: NewTrackerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [instance, setInstance] = useState<InstanceType>('SINGLE')
  const [versionControl, setVersionControl] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setName('')
    setInstance('SINGLE')
    setVersionControl(false)
    setError(null)
    setCreating(false)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 80)
      } else {
        reset()
      }
    },
    [reset],
  )

  const handleInstanceChange = useCallback((val: InstanceType) => {
    setInstance(val)
    if (val === 'MULTI') setVersionControl(false)
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmedName = name.trim()
      if (!trimmedName) {
        setError('Please enter a name.')
        inputRef.current?.focus()
        return
      }

      setCreating(true)
      setError(null)

      try {
        const body: Record<string, unknown> = {
          new: true,
          name: trimmedName,
          instance,
          versionControl: instance === 'SINGLE' ? versionControl : false,
        }
        if (projectId) body.projectId = projectId
        if (moduleId) body.moduleId = moduleId

        const res = await fetch('/api/trackers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Failed to create tracker')
        }

        const data = (await res.json()) as { id: string }
        setOpen(false)
        reset()

        if (onCreated) {
          onCreated(data.id)
        } else {
          router.push(`/tracker/${data.id}/edit?new=true`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error creating tracker'
        setError(msg)
        onError?.(msg)
      } finally {
        setCreating(false)
      }
    },
    [name, instance, versionControl, projectId, moduleId, router, onCreated, onError, reset],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 rounded-md text-xs font-medium">
            <FilePlus className="h-3.5 w-3.5" />
            New Tracker
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FilePlus className="h-4 w-4 text-primary" />
            New Tracker
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tracker-name"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="tracker-name"
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
              placeholder="e.g. budget-tracker"
              className="h-9 text-sm"
              disabled={creating}
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground/70">
              If a tracker with this name already exists, a suffix like <span className="font-mono">(1)</span> will be added.
            </p>
          </div>

          {/* Instance */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Layers className="h-3 w-3" />
              Instance
            </legend>
            <div className="flex gap-2">
              {INSTANCE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = instance === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleInstanceChange(opt.value)}
                    disabled={creating}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2.5 text-left transition-all duration-150',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                    <div className="text-[10px] leading-snug opacity-80">
                      {opt.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Version Control */}
          <fieldset
            className={cn(
              'flex flex-col gap-1.5 transition-all duration-200',
              instance === 'MULTI' && 'opacity-40 pointer-events-none',
            )}
            disabled={instance === 'MULTI'}
          >
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <GitBranch className="h-3 w-3" />
              Version Control
            </legend>
            <button
              type="button"
              role="switch"
              aria-checked={versionControl && instance === 'SINGLE'}
              onClick={() => instance === 'SINGLE' && setVersionControl((v) => !v)}
              disabled={creating || instance === 'MULTI'}
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-150 w-full',
                versionControl && instance === 'SINGLE'
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                  : 'border-border bg-muted/20 hover:bg-muted/50',
              )}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {versionControl && instance === 'SINGLE' ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-[10px] text-muted-foreground leading-snug">
                  {instance === 'MULTI'
                    ? 'Not available for Multi-instance trackers.'
                    : 'Create branches, compare diffs, and merge changes.'}
                </div>
              </div>
              <div
                aria-hidden="true"
                className={cn(
                  'flex-shrink-0 ml-4 w-9 h-5 rounded-full transition-colors duration-200 relative',
                  versionControl && instance === 'SINGLE' ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                    versionControl && instance === 'SINGLE' ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </div>
            </button>

            <div
              className={cn(
                'overflow-hidden transition-all duration-200',
                versionControl && instance === 'SINGLE' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="flex items-start gap-1.5 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 mt-1">
                <Info className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-primary/80 leading-snug">
                  A <strong>main</strong> branch will be created on first save. You can branch, diff, and merge from the tracker toolbar.
                </p>
              </div>
            </div>
          </fieldset>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={creating}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={creating || !name.trim()}
              className="rounded-md gap-1.5 min-w-[100px]"
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <FilePlus className="h-3.5 w-3.5" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
