'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, FileText, Pencil, Plus, Save, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldSettingsDialog } from '@/app/components/tracker-display/edit-mode/field-settings'
import { DataTable } from '@/app/components/tracker-display/grids/data-table/data-table'
import type {
  TrackerDisplayProps,
  TrackerField,
} from '@/app/components/tracker-display/types'

type WorkspaceMode = 'bindings' | 'validations' | 'calculations'

type TrackerRecord = {
  id: string
  name: string | null
  schema: TrackerDisplayProps
}

type EditableTarget = {
  key: string
  gridId: string
  gridName: string
  fieldId: string
  fieldLabel: string
  dataType: string
  count: number
}

function pageTitle(mode: WorkspaceMode): string {
  if (mode === 'bindings') return 'Bindings'
  if (mode === 'validations') return 'Validations'
  return 'Calculations'
}

function isBindable(field: TrackerField): boolean {
  return field.dataType === 'options' || field.dataType === 'multiselect'
}

function modeTab(mode: WorkspaceMode) {
  if (mode === 'bindings') return 'bindings' as const
  if (mode === 'validations') return 'validations' as const
  return 'calculations' as const
}

function modeCountLabel(mode: WorkspaceMode) {
  if (mode === 'bindings') return 'Links'
  if (mode === 'validations') return 'Rules'
  return 'Formulas'
}

export function TrackerSettingsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('Untitled tracker')
  const [schema, setSchema] = useState<TrackerDisplayProps | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [selected, setSelected] = useState<{ fieldId: string; gridId: string } | null>(
    null,
  )
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addSelection, setAddSelection] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('Invalid tracker')
      setLoading(false)
      return
    }
    let cancelled = false
    async function run() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/trackers/${id}`)
        if (!res.ok) {
          setError(res.status === 404 ? 'Tracker not found' : 'Failed to load tracker')
          return
        }
        const data = (await res.json()) as TrackerRecord
        if (cancelled) return
        setName(data.name ?? 'Untitled tracker')
        setSchema(data.schema ?? ({} as TrackerDisplayProps))
        setDirty(false)
      } catch {
        if (!cancelled) setError('Failed to load tracker')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id])

  const targets = useMemo<EditableTarget[]>(() => {
    if (!schema) return []
    const fields = schema.fields ?? []
    const fieldById = new Map(fields.map((f) => [f.id, f]))
    const gridById = new Map((schema.grids ?? []).map((g) => [g.id, g]))
    const validations = schema.validations ?? {}
    const calculations = schema.calculations ?? {}
    const bindings = schema.bindings ?? {}

    const seen = new Set<string>()
    const rows: EditableTarget[] = []

    for (const node of schema.layoutNodes ?? []) {
      const key = `${node.gridId}.${node.fieldId}`
      if (seen.has(key)) continue
      seen.add(key)
      const field = fieldById.get(node.fieldId)
      if (!field) continue
      if (mode === 'bindings' && !isBindable(field)) continue
      const count =
        mode === 'bindings'
          ? bindings[key]
            ? 1
            : 0
          : mode === 'validations'
            ? (validations[key]?.length ?? 0)
            : calculations[key]
              ? 1
              : 0
      rows.push({
        key,
        gridId: node.gridId,
        gridName: gridById.get(node.gridId)?.name ?? node.gridId,
        fieldId: field.id,
        fieldLabel: field.ui?.label ?? field.id,
        dataType: field.dataType,
        count,
      })
    }

    return rows.sort((a, b) => a.gridName.localeCompare(b.gridName) || a.fieldLabel.localeCompare(b.fieldLabel))
  }, [schema, mode])

  const configuredTargets = useMemo(
    () => targets.filter((target) => target.count > 0),
    [targets],
  )
  const availableTargets = useMemo(
    () => targets.filter((target) => target.count === 0),
    [targets],
  )

  const onSchemaChange = useCallback((next: TrackerDisplayProps) => {
    setSchema(next)
    setDirty(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!id || !schema) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trackers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, schema }),
      })
      if (!res.ok) throw new Error('Failed to save tracker')
      setDirty(false)
    } catch {
      setError('Failed to save tracker')
    } finally {
      setSaving(false)
    }
  }, [id, name, schema])

  const title = pageTitle(mode)
  const configuredCount = configuredTargets.length

  const rows = useMemo(
    () =>
      configuredTargets.map((target) => ({
        id: target.key,
        field: target.fieldLabel,
        grid: target.gridName,
        configured: target.count,
        target,
      })),
    [configuredTargets],
  )

  const columns = useMemo<ColumnDef<(typeof rows)[number]>[]>(
    () => [
      {
        accessorKey: 'field',
        header: 'Field',
        cell: ({ row }) => (
          <div className="flex flex-col py-0.5">
            <span className="font-medium text-foreground">{row.original.field}</span>
            <span className="text-[11px] capitalize text-muted-foreground">
              {row.original.target.dataType.replace(/_/g, ' ')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'grid',
        header: 'Grid',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/35 px-2 py-1 text-xs text-muted-foreground">
            {row.original.grid}
          </span>
        ),
      },
      {
        accessorKey: 'configured',
        header: modeCountLabel(mode),
        cell: ({ row }) => (
          <Badge
            variant={row.original.configured > 0 ? 'secondary' : 'outline'}
            className="font-semibold tabular-nums"
          >
            {row.original.configured}
          </Badge>
        ),
      },
    ],
    [mode],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (error || !id || !schema) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{error ?? 'Failed to load tracker'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 h-12 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <nav className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/tracker/${id}`)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to tracker"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold truncate">{name}</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={`/tracker/${id}`}>
                <FileText className="h-3.5 w-3.5" /> Tracker
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={`/tracker/${id}/edit`}>
                <Pencil className="h-3.5 w-3.5" /> Full editor
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={!dirty || saving}
              onClick={handleSave}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{title} Workspace</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="tabular-nums text-[11px]">
              {configuredCount} configured
            </Badge>
            <Badge variant="outline" className="tabular-nums text-[11px]">
              {availableTargets.length} available
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setAddSelection(availableTargets[0]?.key ?? null)
                setAddDialogOpen(true)
              }}
              disabled={availableTargets.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              Add another
            </Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border/60 px-3 py-10 text-center text-sm text-muted-foreground">
            No configured {title.toLowerCase()} yet. Use <span className="font-medium">Add another</span> to start.
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/35 p-3 shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              addable={false}
              deletable={false}
              editable={false}
              editLayoutAble={false}
              showRowDetails={false}
              renderRowAction={({ row }) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 min-w-16 text-xs"
                  onClick={() =>
                    setSelected({ fieldId: row.target.fieldId, gridId: row.target.gridId })
                  }
                >
                  Edit
                </Button>
              )}
              styleOverrides={{
                density: 'comfortable',
                headerStyle: 'muted',
                borderStyle: 'strong',
                stripedRows: true,
              }}
            />
          </div>
        )}
      </main>

      <FieldSettingsDialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        fieldId={selected?.fieldId ?? null}
        gridId={selected?.gridId ?? null}
        defaultTab={modeTab(mode)}
        allowedTabs={[modeTab(mode)]}
        schema={schema}
        onSchemaChange={onSchemaChange}
      />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pick a field to configure. After selecting, the focused editor will open directly.
            </p>
            <Select
              value={addSelection ?? undefined}
              onValueChange={(value) => setAddSelection(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((target) => (
                  <SelectItem key={target.key} value={target.key}>
                    {target.gridName} / {target.fieldLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!addSelection) return
                const target = availableTargets.find((item) => item.key === addSelection)
                if (!target) return
                setSelected({ fieldId: target.fieldId, gridId: target.gridId })
                setAddDialogOpen(false)
              }}
              disabled={!addSelection}
            >
              Open editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
