 'use client'

import { useCallback, useEffect, useRef } from 'react'

export type AutoSaveState = 'idle' | 'saving' | 'error'

export interface UseAutoSaveOptions<TData> {
  enabled: boolean
  getData: () => TData
  save: (data: TData) => Promise<void>
  debounceMs?: number
  idleMs?: number
  onStateChange?: (state: AutoSaveState, error?: Error) => void
}

export function useAutoSave<TData>({
  enabled,
  getData,
  save,
  debounceMs = 800,
  idleMs = 0,
  onStateChange,
}: UseAutoSaveOptions<TData>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const pendingRef = useRef(false)
  const lastChangeAtRef = useRef<number | null>(null)

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const getDataRef = useRef(getData)
  getDataRef.current = getData
  const saveRef = useRef(save)
  saveRef.current = save
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const idleMsRef = useRef(idleMs)
  idleMsRef.current = idleMs
  const debounceMsRef = useRef(debounceMs)
  debounceMsRef.current = debounceMs

  const lastSavedJsonRef = useRef<string | null>(null)

  const flush = useCallback(async () => {
    if (!enabledRef.current) {
      pendingRef.current = false
      return
    }
    if (inFlightRef.current || !pendingRef.current) return

    const currentIdleMs = idleMsRef.current
    const lastChangeAt = lastChangeAtRef.current
    if (currentIdleMs > 0 && lastChangeAt != null) {
      const idleFor = Date.now() - lastChangeAt
      if (idleFor < currentIdleMs) {
        const wait = Math.max(0, currentIdleMs - idleFor)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          void flush()
        }, wait)
        return
      }
    }

    const data = getDataRef.current()
    const json = JSON.stringify(data)

    if (json === lastSavedJsonRef.current) {
      pendingRef.current = false
      return
    }

    pendingRef.current = false
    inFlightRef.current = true
    onStateChangeRef.current?.('saving')
    try {
      await saveRef.current(data)
      lastSavedJsonRef.current = json
      onStateChangeRef.current?.('idle')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Auto-save failed')
      onStateChangeRef.current?.('error', error)
    } finally {
      inFlightRef.current = false
      if (pendingRef.current) void flush()
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (!enabledRef.current) return
    pendingRef.current = true
    lastChangeAtRef.current = Date.now()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flush()
    }, debounceMsRef.current)
  }, [flush])

  useEffect(() => {
    if (enabled) return
    pendingRef.current = false
    lastChangeAtRef.current = null
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [enabled])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { scheduleSave }
}

