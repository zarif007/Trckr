'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { BranchRecord } from '@/app/components/tracker-page/TrackerBranchPanel'
import type { GridDataSnapshot } from '../../TrackerPanel'
import type { LoadedSnapshot } from '../types'

export function useVersionControlState(
  versionControl: boolean,
  trackerId: string | null | undefined,
  initialBranchName: string | null | undefined,
  onBranchChange?: (branchName: string) => void
) {
  const [vcBranches, setVcBranches] = useState<BranchRecord[]>([])
  const [vcCurrentBranch, setVcCurrentBranch] = useState<BranchRecord | null>(null)
  const [loadedSnapshot, setLoadedSnapshot] = useState<LoadedSnapshot | null>(null)
  const vcCurrentBranchRef = useRef<BranchRecord | null>(null)
  vcCurrentBranchRef.current = vcCurrentBranch

  useEffect(() => {
    if (!versionControl || !trackerId) return
    let cancelled = false
    async function fetchBranches() {
      try {
        const res = await fetch(`/api/trackers/${trackerId}/branches`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        const branches: BranchRecord[] = data.branches ?? []
        setVcBranches(branches)
        const selected =
          (initialBranchName && branches.find((b) => b.branchName === initialBranchName && !b.isMerged)) ??
          branches.find((b) => b.branchName === 'main' && !b.isMerged)
        if (selected) {
          setVcCurrentBranch(selected)
          if (selected.data && typeof selected.data === 'object') {
            setLoadedSnapshot({
              id: selected.id,
              label: selected.label ?? selected.branchName,
              data: selected.data as GridDataSnapshot,
              updatedAt: selected.updatedAt,
              formStatus: (selected as BranchRecord & { formStatus?: string | null }).formStatus ?? null,
            })
          }
        }
      } catch {
        // ignore
      }
    }
    fetchBranches()
    return () => {
      cancelled = true
    }
  }, [versionControl, trackerId, initialBranchName])

  const handleVcBranchSwitch = useCallback(
    (branch: BranchRecord) => {
      setVcCurrentBranch(branch)
      if (branch.data && typeof branch.data === 'object') {
        const snapshot: LoadedSnapshot = {
          id: branch.id,
          label: branch.label ?? branch.branchName,
          data: branch.data as GridDataSnapshot,
          updatedAt: branch.updatedAt,
          formStatus: (branch as BranchRecord & { formStatus?: string | null }).formStatus ?? null,
        }
        setLoadedSnapshot(snapshot)
      }
      onBranchChange?.(branch.branchName)
    },
    [onBranchChange]
  )

  const handleVcBranchCreated = useCallback(
    (branch: BranchRecord) => {
      setVcBranches((prev) => [branch, ...prev])
      handleVcBranchSwitch(branch)
    },
    [handleVcBranchSwitch]
  )

  const handleVcMergedToMain = useCallback(
    (updatedMain: BranchRecord) => {
      setVcBranches((prev) =>
        prev.map((b) => {
          if (b.branchName === 'main' && !b.isMerged) return updatedMain
          if (b.id === vcCurrentBranchRef.current?.id) return { ...b, isMerged: true }
          return b
        })
      )
      handleVcBranchSwitch(updatedMain)
    },
    [handleVcBranchSwitch]
  )

  return {
    vcBranches,
    setVcBranches,
    vcCurrentBranch,
    setVcCurrentBranch,
    vcCurrentBranchRef,
    loadedSnapshot,
    setLoadedSnapshot,
    handleVcBranchSwitch,
    handleVcBranchCreated,
    handleVcMergedToMain,
  }
}
