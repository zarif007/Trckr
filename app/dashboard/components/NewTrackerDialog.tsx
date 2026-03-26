'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FilePlus, GitBranch, Layers, Info, Table2, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  shortLabel: string
  icon: typeof Table2 | typeof Layers
  description: string
}> = [
  {
    value: 'SINGLE',
    label: 'Single',
    shortLabel: 'One dataset',
    icon: Table2,
    description: 'One shared dataset. Optional version control (branches, merge).',
  },
  {
    value: 'MULTI',
    label: 'Multi',
    shortLabel: 'Many rows',
    icon: Layers,
    description: 'Separate instances, each with its own data and timestamp.',
  },
]

function SettingsToggleRow({
  title,
  description,
  checked,
  onToggle,
  disabled,
}: {
  title: string
  description?: string
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        if (disabled) return
        onToggle()
      }}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between rounded-md border px-3 py-2 text-left transition-all duration-150 w-full',
        checked
          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
          : cn('border-border bg-muted/20', !disabled && 'hover:bg-muted/50'),
        disabled && 'cursor-not-allowed opacity-80',
      )}
    >
      <div className="min-w-0 pr-2">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description ? (
          <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'flex-shrink-0 w-9 h-5 rounded-md transition-colors duration-200 relative',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-primary-foreground shadow-sm transition-[left] duration-200 ease-out',
            checked ? 'left-[calc(100%-1rem-0.125rem)]' : 'left-0.5',
          )}
        />
      </div>
    </button>
  )
}

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

  const selectedScope = SCOPE_OPTIONS.find((o) => o.value === masterDataScope)
  const instanceHelp = INSTANCE_OPTIONS.find((o) => o.value === instance)?.description ?? ''

  const choicesSummary =
    instance === 'MULTI'
      ? `${INSTANCE_OPTIONS.find((o) => o.value === 'MULTI')?.label ?? 'Multi'} · ${selectedScope?.label ?? ''} scope`
      : [
          INSTANCE_OPTIONS.find((o) => o.value === 'SINGLE')?.label ?? 'Single',
          `${selectedScope?.label ?? ''} scope`,
          versionControl ? 'Version control' : autoSave ? 'Auto-save' : 'Manual save',
        ].join(' · ')

  const scopeCallout = (() => {
    if (scopeDefaultLoading && projectId) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          Loading defaults…
        </div>
      )
    }
    if (!projectId) {
      return (
        <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground leading-snug">
          Master data stays in this tracker until it belongs to a project.
        </div>
      )
    }
    return null
  })()

  const vcChecked = versionControl && instance === 'SINGLE'
  const autoSaveChecked = autoSave && instance === 'SINGLE' && !versionControl
  const savingDisabled = instance === 'MULTI'

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

      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FilePlus className="h-4 w-4 text-primary" />
            New Tracker
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new tracker.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tracker-name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="tracker-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="e.g. budget-tracker"
                  className="h-9 text-sm"
                  disabled={creating}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Duplicate names get a suffix like <span className="font-mono">(1)</span>.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    Instance
                  </div>
                  <Tabs
                    value={instance}
                    onValueChange={(v) => handleInstanceChange(v as InstanceType)}
                    className="gap-2"
                  >
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-[2px] p-0.5">
                      {INSTANCE_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        return (
                          <TabsTrigger
                            key={opt.value}
                            value={opt.value}
                            disabled={creating}
                            className="gap-1.5 py-2 text-xs"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {opt.shortLabel}
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </Tabs>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{instanceHelp}</p>
                </div>

                <div className="h-px bg-border/60" role="presentation" />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Database className="h-3.5 w-3.5 shrink-0" />
                    Scope
                  </div>
                  {scopeCallout}
                  <Select
                    value={masterDataScope}
                    onValueChange={(v) => setMasterDataScope(v as MasterDataScope)}
                    disabled={creating || scopeDefaultLoading}
                  >
                    <SelectTrigger size="sm" className="h-9 w-full min-w-0 font-normal">
                      <SelectValue placeholder={scopeDefaultLoading ? 'Loading…' : 'Choose scope'} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      {SCOPE_OPTIONS.map((opt) => {
                        const moduleChoiceDisabled = opt.value === 'module' && !moduleId
                        const itemDisabled =
                          moduleChoiceDisabled || (!projectId && opt.value !== 'tracker')
                        return (
                          <SelectItem key={opt.value} value={opt.value} disabled={itemDisabled}>
                            {opt.label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {selectedScope ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedScope.description}</p>
                  ) : null}
                  {!moduleId && projectId ? (
                    <p className="text-[11px] text-muted-foreground">
                      Module scope appears when you create a tracker from inside a module.
                    </p>
                  ) : null}
                  {showSetDefaultCheckbox ? (
                    <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center translate-y-px">
                        <Checkbox
                          checked={persistOwnerDefault}
                          onCheckedChange={(v) => setPersistOwnerDefault(v === true)}
                          disabled={creating}
                        />
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug pt-px min-w-0">
                        Remember this as the default for this {ownerKindLabel}
                      </span>
                    </label>
                  ) : null}
                  {showUpdateDefaultCheckbox ? (
                    <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 gap-y-0">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center translate-y-px">
                        <Checkbox
                          checked={persistOwnerDefault}
                          onCheckedChange={(v) => setPersistOwnerDefault(v === true)}
                          disabled={creating}
                        />
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug pt-px min-w-0">
                        Update default {ownerKindLabel} setting to &ldquo;{masterDataScope}&rdquo;
                      </span>
                    </label>
                  ) : null}
                </div>

                <div className="h-px bg-border/60" role="presentation" />

                <fieldset
                  className={cn('space-y-2', savingDisabled && 'opacity-40')}
                  disabled={savingDisabled}
                >
                  <legend className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground mb-0">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    Saving
                  </legend>
                  <p className="text-[11px] text-muted-foreground pb-1">
                    For one dataset only. Version control disables auto-save.
                  </p>
                  <div className="flex flex-col gap-2">
                    <SettingsToggleRow
                      title="Version control"
                      description={
                        instance === 'MULTI'
                          ? 'Not available for multi-instance trackers.'
                          : vcChecked
                            ? 'Branches, diffs, and merges.'
                            : 'Off'
                      }
                      checked={vcChecked}
                      disabled={creating || instance === 'MULTI'}
                      onToggle={() => {
                        if (instance !== 'SINGLE') return
                        setVersionControl((v) => {
                          const next = !v
                          if (next) setAutoSave(false)
                          return next
                        })
                      }}
                    />
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-200',
                        vcChecked ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
                      )}
                    >
                      <div className="flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <p className="text-[10px] leading-snug text-primary/80">
                          A <strong>main</strong> branch is created on first save. Use the tracker toolbar to branch
                          and merge.
                        </p>
                      </div>
                    </div>
                    <SettingsToggleRow
                      title="Auto-save"
                      description={
                        instance === 'MULTI'
                          ? 'Not available for multi-instance trackers.'
                          : versionControl
                            ? 'Off while version control is on.'
                            : autoSaveChecked
                              ? 'Saves as you edit.'
                              : 'Off — save manually.'
                      }
                      checked={autoSaveChecked}
                      disabled={creating || instance === 'MULTI' || versionControl}
                      onToggle={() => {
                        if (instance !== 'SINGLE' || versionControl) return
                        setAutoSave((v) => !v)
                      }}
                    />
                  </div>
                </fieldset>
              </div>

              {error ? (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col items-stretch gap-3 border-t bg-muted/10 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p
              className="text-[11px] text-muted-foreground leading-snug sm:min-w-0 sm:flex-1 sm:pr-2"
              title={choicesSummary}
            >
              {choicesSummary}
            </p>
            <div className="flex justify-end gap-2 shrink-0">
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
                className="min-w-[100px] gap-1.5 rounded-md"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
