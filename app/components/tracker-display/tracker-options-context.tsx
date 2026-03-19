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
  trackerSchemaId,
  children,
}: {
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  sections?: TrackerSection[]
  dynamicOptions?: DynamicOptionsDefinitions
  gridData?: Record<string, Array<Record<string, unknown>>>
  trackerSchemaId?: string | null
  children: React.ReactNode
}) {
  const value = useMemo<TrackerContextForOptions>(
    () => ({
      grids,
      fields,
      layoutNodes,
      sections,
      dynamicOptions,
      gridData,
      ...(trackerSchemaId ? { trackerSchemaId } : {}),
    }),
    [grids, fields, layoutNodes, sections, dynamicOptions, gridData, trackerSchemaId]
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
