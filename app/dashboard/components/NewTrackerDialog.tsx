'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FilePlus, GitBranch, Layers, Info, FileText, Table2, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { MasterDataScope } from '@/lib/master-data-scope'
import { cn } from '@/lib/utils'

interface NewTrackerDialogProps {
  projectId?: string
  moduleId?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (trackerId: string) => void
  onError?: (msg: string) => void
}

type InstanceType = 'SINGLE' | 'MULTI'

type InheritedSource = 'none' | 'module' | 'project'

type ScopeDefaultResponse = {
  inheritedDefault: MasterDataScope | null
  inheritedSource: InheritedSource
  inheritedSourceModuleId?: string
  ownerTarget:
    | { kind: 'module'; moduleId: string; projectId: string }
    | { kind: 'project'; projectId: string }
}

const SCOPE_OPTIONS: Array<{
  value: MasterDataScope
  label: string
  description: string
}> = [
  {
    value: 'tracker',
    label: 'Tracker',
    description: 'Master data lives only in this tracker.',
  },
  {
    value: 'module',
    label: 'Module',
    description: 'Master data is available to every tracker in this module.',
  },
  {
    value: 'project',
    label: 'Project',
    description: 'Master data is available across the entire project.',
  },
]

const INSTANCE_OPTIONS: Array<{
  value: InstanceType
  label: string
  icon: typeof Table2 | typeof Layers
  description: string
}> = [
  {
    value: 'SINGLE',
    label: 'Single',
    icon: Table2,
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
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
  onError,
}: NewTrackerDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen
  const [name, setName] = useState('')
  const [instance, setInstance] = useState<InstanceType>('SINGLE')
  const [versionControl, setVersionControl] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [masterDataScope, setMasterDataScope] = useState<MasterDataScope>('tracker')
  const [scopeDefaultLoading, setScopeDefaultLoading] = useState(false)
  const [scopeHint, setScopeHint] = useState<ScopeDefaultResponse | null>(null)
  /** Scope preselected when defaults finished loading (for scenario B / change detection) */
  const scopeBaselineRef = useRef<MasterDataScope>('tracker')
  const [persistOwnerDefault, setPersistOwnerDefault] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setInstance('SINGLE')
    setVersionControl(false)
    setAutoSave(true)
    setError(null)
    setCreating(false)
    setMasterDataScope('tracker')
    setScopeHint(null)
    scopeBaselineRef.current = 'tracker'
    setPersistOwnerDefault(false)
    setScopeDefaultLoading(false)
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

  useEffect(() => {
    if (!open || !projectId) {
      if (!open) return
      setMasterDataScope('tracker')
      scopeBaselineRef.current = 'tracker'
      setScopeHint(null)
      return
    }

    let cancelled = false
    setScopeDefaultLoading(true)
    const q = moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : ''
    fetch(`/api/projects/${projectId}/master-data-scope-default${q}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load defaults')
        return res.json() as Promise<ScopeDefaultResponse>
      })
      .then((data) => {
        if (cancelled) return
        setScopeHint(data)
        const initial = data.inheritedDefault ?? 'tracker'
        setMasterDataScope(initial)
        scopeBaselineRef.current = initial
        setPersistOwnerDefault(false)
      })
      .catch(() => {
        if (cancelled) return
        setScopeHint(null)
        setMasterDataScope('tracker')
        scopeBaselineRef.current = 'tracker'
      })
      .finally(() => {
        if (!cancelled) setScopeDefaultLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, projectId, moduleId])

  const hasInheritedDefault = scopeHint?.inheritedDefault != null
  const scenarioA = Boolean(projectId && !hasInheritedDefault && !scopeDefaultLoading)
  const scenarioB = Boolean(projectId && hasInheritedDefault)
  const scopeChangedFromBaseline = masterDataScope !== scopeBaselineRef.current
  const showSetDefaultCheckbox = Boolean(projectId && scenarioA)
  const showUpdateDefaultCheckbox = Boolean(projectId && scenarioB && scopeChangedFromBaseline)
  const ownerKindLabel = scopeHint
    ? scopeHint.ownerTarget.kind === 'module'
      ? 'module'
      : 'project'
    : moduleId
      ? 'module'
      : 'project'

  const handleInstanceChange = useCallback((val: InstanceType) => {
    setInstance(val)
    if (val === 'MULTI') {
      setVersionControl(false)
      setAutoSave(false)
    } else {
      setAutoSave(true)
    }
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
          autoSave: instance === 'SINGLE' && !versionControl ? autoSave : false,
          masterDataScope,
        }
        if (projectId) body.projectId = projectId
        if (moduleId) body.moduleId = moduleId
        if (persistOwnerDefault && showSetDefaultCheckbox) {
          body.setMasterDataDefaultForOwner = true
        }
        if (persistOwnerDefault && showUpdateDefaultCheckbox) {
          body.updateMasterDataDefaultForOwner = true
        }

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
    [
      name,
      instance,
      versionControl,
      autoSave,
      projectId,
      moduleId,
      masterDataScope,
      persistOwnerDefault,
      showSetDefaultCheckbox,
      showUpdateDefaultCheckbox,
      router,
      onCreated,
      onError,
      reset,
    ],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 rounded-md text-xs font-medium">
              <FilePlus className="h-3.5 w-3.5" />
              New Tracker
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Master data scope */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Database className="h-3 w-3" />
              Master data scope
            </legend>
            {scopeDefaultLoading && projectId ? (
              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading defaults…
              </p>
            ) : null}
            {scenarioB ? (
              <p className="text-[10px] text-muted-foreground leading-snug">
                Default from{' '}
                {scopeHint?.inheritedSource === 'project'
                  ? 'Project settings'
                  : 'Module settings'}
                {scopeHint?.inheritedSource === 'module' && scopeHint.inheritedSourceModuleId
                  ? ' (ancestor module)'
                  : null}
                : <span className="font-medium text-foreground">{scopeHint?.inheritedDefault}</span>
              </p>
            ) : null}
            {!projectId ? (
              <p className="text-[10px] text-muted-foreground leading-snug">
                Master data is stored in this tracker only until the tracker belongs to a project.
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {SCOPE_OPTIONS.map((opt) => {
                const moduleChoiceDisabled = opt.value === 'module' && !moduleId
                const disabled =
                  creating || scopeDefaultLoading || moduleChoiceDisabled || (!projectId && opt.value !== 'tracker')
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (disabled) return
                      setMasterDataScope(opt.value)
                    }}
                    disabled={disabled}
                    aria-pressed={masterDataScope === opt.value}
                    className={cn(
                      'rounded-md border px-3 py-2 text-left transition-all duration-150 w-full',
                      masterDataScope === opt.value
                        ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      disabled && 'opacity-40 pointer-events-none',
                    )}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] leading-snug opacity-80 mt-0.5">{opt.description}</div>
                    {moduleChoiceDisabled ? (
                      <div className="text-[10px] text-muted-foreground mt-1">Only when creating inside a module.</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
            {showSetDefaultCheckbox ? (
              <label className="flex items-start gap-2 cursor-pointer mt-1">
                <Checkbox
                  checked={persistOwnerDefault}
                  onCheckedChange={(v) => setPersistOwnerDefault(v === true)}
                  disabled={creating}
                  className="mt-0.5"
                />
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Set this as the default for this {ownerKindLabel}?
                </span>
              </label>
            ) : null}
            {showUpdateDefaultCheckbox ? (
              <label className="flex items-start gap-2 cursor-pointer mt-1">
                <Checkbox
                  checked={persistOwnerDefault}
                  onCheckedChange={(v) => setPersistOwnerDefault(v === true)}
                  disabled={creating}
                  className="mt-0.5"
                />
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Update default {ownerKindLabel} setting to &ldquo;{masterDataScope}&rdquo;?
                </span>
              </label>
            ) : null}
          </fieldset>

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
                      'flex-1 rounded-md border px-3 py-2.5 text-left transition-all duration-150',
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
              onClick={() => {
                if (instance !== 'SINGLE') return
                setVersionControl((v) => {
                  const next = !v
                  if (next) setAutoSave(false)
                  return next
                })
              }}
              disabled={creating || instance === 'MULTI'}
              className={cn(
                'flex items-center justify-between rounded-md border px-4 py-3 text-left transition-all duration-150 w-full',
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
                  'flex-shrink-0 ml-4 w-9 h-5 rounded-md transition-colors duration-200 relative',
                  versionControl && instance === 'SINGLE' ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-primary-foreground shadow-sm transition-[left] duration-200 ease-out',
                    versionControl && instance === 'SINGLE'
                      ? 'left-[calc(100%-1rem-0.125rem)]'
                      : 'left-0.5',
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

          {/* Auto Save */}
          <fieldset
            className={cn(
              'flex flex-col gap-1.5 transition-all duration-200',
              (instance === 'MULTI' || versionControl) && 'opacity-40 pointer-events-none',
            )}
            disabled={instance === 'MULTI' || versionControl}
          >
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3 w-3" />
              Auto Save
            </legend>
            <button
              type="button"
              role="switch"
              aria-checked={autoSave && instance === 'SINGLE' && !versionControl}
              onClick={() => {
                if (instance !== 'SINGLE' || versionControl) return
                setAutoSave((v) => !v)
              }}
              disabled={creating || instance === 'MULTI' || versionControl}
              className={cn(
                'flex items-center justify-between rounded-md border px-4 py-3 text-left transition-all duration-150 w-full',
                autoSave && instance === 'SINGLE' && !versionControl
                  ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                  : 'border-border bg-muted/20 hover:bg-muted/50',
              )}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {autoSave && instance === 'SINGLE' && !versionControl ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-[10px] text-muted-foreground leading-snug">
                  {instance === 'MULTI'
                    ? 'Not available for Multi-instance trackers.'
                    : versionControl
                      ? 'Disabled when version control is enabled.'
                      : 'Automatically save changes as you edit.'}
                </div>
              </div>
              <div
                aria-hidden="true"
                className={cn(
                  'flex-shrink-0 ml-4 w-9 h-5 rounded-md transition-colors duration-200 relative',
                  autoSave && instance === 'SINGLE' && !versionControl ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-primary-foreground shadow-sm transition-[left] duration-200 ease-out',
                    autoSave && instance === 'SINGLE' && !versionControl
                      ? 'left-[calc(100%-1rem-0.125rem)]'
                      : 'left-0.5',
                  )}
                />
              </div>
            </button>
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
