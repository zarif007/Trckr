'use client'

import { createContext, useContext, useMemo } from 'react'
import type { TrackerGrid, TrackerField, TrackerLayoutNode, TrackerSection } from './types'
import type { TrackerContextForOptions } from '@/lib/binding'
import type { DynamicOptionsDefinitions } from '@/lib/dynamic-options'

const TrackerOptionsContext = createContext<TrackerContextForOptions | null>(null)

export function TrackerOptionsProvider({
  grids,
  fields,
  layoutNodes,
  sections,
  dynamicOptions,
  gridData,
  children,
}: {
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  sections?: TrackerSection[]
  dynamicOptions?: DynamicOptionsDefinitions
  gridData?: Record<string, Array<Record<string, unknown>>>
  children: React.ReactNode
}) {
  const value = useMemo<TrackerContextForOptions>(
    () => ({ grids, fields, layoutNodes, sections, dynamicOptions, gridData }),
    [grids, fields, layoutNodes, sections, dynamicOptions, gridData]
  )
  return (
    <TrackerOptionsContext.Provider value={value}>
      {children}
    </TrackerOptionsContext.Provider>
  )
}

export function useTrackerOptionsContext(): TrackerContextForOptions | null {
  return useContext(TrackerOptionsContext)
}
