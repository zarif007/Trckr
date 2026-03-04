'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Loader2, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import type { GridDataSnapshot } from '@/lib/tracker-data'

type TrackerDataItem = {
  id: string
  label: string | null
  data: GridDataSnapshot
  createdAt: string
  updatedAt: string
}

export function TrackerDataSave({
  trackerId,
  trackerDataRef,
  onLoadSnapshot,
  onSavedNewSnapshot,
  onRegisterSaveData,
  disabled,
}: {
  trackerId: string
  trackerDataRef: React.RefObject<(() => GridDataSnapshot) | null>
  onLoadSnapshot?: (snapshot: { id: string; label: string | null; data: GridDataSnapshot; updatedAt?: string }) => void
  onSavedNewSnapshot?: (snapshot: { id: string; label: string | null; data: GridDataSnapshot; updatedAt?: string }) => void
  /** Register a one-click save (no name) so the navbar can trigger it. */
  onRegisterSaveData?: (fn: () => void) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [list, setList] = useState<TrackerDataItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const handleSaveRef = useRef<(overrideLabel?: string) => Promise<void>>(async () => {})

  const fetchList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await fetch(`/api/trackers/${trackerId}/data?limit=50`)
      if (!res.ok) {
        setList([])
        return
      }
      const data = await res.json()
      setList(data.items ?? [])
    } catch {
      setList([])
    } finally {
      setListLoading(false)
    }
  }, [trackerId])

  useEffect(() => {
    if (open && trackerId) fetchList()
  }, [open, trackerId, fetchList])

  const handleSave = async (overrideLabel?: string) => {
    let data: GridDataSnapshot = {}
    const getData = trackerDataRef.current
    if (getData && typeof getData === 'function') {
      const raw = getData()
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        data = raw
      }
    }
    const label = overrideLabel !== undefined ? (overrideLabel.trim() || undefined) : (saveLabel.trim() || undefined)
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/trackers/${trackerId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          data,
        }),
      })
      const responseData = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof responseData?.error === 'string'
            ? responseData.error
            : `Failed to save (${res.status})`
        throw new Error(msg)
      }
      setSaveLabel('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      await fetchList()
      // Auto-load the snapshot we just created and mark it as latest
      const created = responseData as { id?: string; label?: string | null; data?: GridDataSnapshot; updatedAt?: string }
      if (created?.id && created?.data && typeof created.data === 'object' && !Array.isArray(created.data)) {
        const snapshot = {
          id: created.id,
          label: created.label ?? null,
          data: created.data,
          updatedAt: created.updatedAt,
        }
        if (onSavedNewSnapshot) {
          onSavedNewSnapshot(snapshot)
        } else if (onLoadSnapshot) {
          onLoadSnapshot(snapshot)
        }
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
      setOpen(true)
    } finally {
      setSaving(false)
    }
  }
  handleSaveRef.current = handleSave

  useEffect(() => {
    if (!onRegisterSaveData) return
    onRegisterSaveData(() => handleSaveRef.current(''))
    return () => onRegisterSaveData(() => {})
  }, [onRegisterSaveData])

  const handleDelete = async (dataId: string) => {
    setDeletingId(dataId)
    try {
      const res = await fetch(`/api/trackers/${trackerId}/data/${dataId}`, {
        method: 'DELETE',
      })
      if (res.ok) await fetchList()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={disabled}
          aria-label="Data versions — view history, save with name, load or delete snapshots"
        >
          <History className="h-3.5 w-3.5" />
          Versions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/60">
          <p className="text-xs font-medium text-muted-foreground mb-2">Save a data snapshot</p>
          <p className="text-[11px] text-muted-foreground/80 mb-2">
            Add a name below to find this snapshot later, or leave blank.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Snapshot name (optional)"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 gap-1 text-xs shrink-0"
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save snapshot
            </Button>
          </div>
          {saveError && (
            <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5">
              <p className="text-xs font-medium text-destructive">{saveError}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Sign in and open this tracker from the dashboard to save versions.
              </p>
            </div>
          )}
          {saveSuccess && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">Snapshot saved.</p>
          )}
        </div>
        <div className="p-3 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2">Your snapshots</p>
          {listLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No saved data yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {item.label || 'Unnamed'}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs"
                      onClick={() => {
                        onLoadSnapshot?.({ id: item.id, label: item.label, data: item.data, updatedAt: item.updatedAt })
                        setOpen(false)
                      }}
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label="Delete snapshot"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
