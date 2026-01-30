'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
} from './types'
import { TrackerSection } from './tracker-section'

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  gridData,
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(() => {
    return (tabs ?? []).sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(
    normalizedTabs[0]?.fieldName || '',
  )

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some(
        (tab) => tab.fieldName === activeTabId,
      )
      if (!activeTabId || !tabExists) {
        setActiveTabId(normalizedTabs[0].fieldName)
      }
    }
  }, [normalizedTabs, activeTabId])

  const [localGridData, setLocalGridData] = useState<
    Record<string, Array<Record<string, unknown>>>
  >(gridData ?? {})

  useEffect(() => {
    setLocalGridData(gridData ?? {})
  }, [gridData])

  const handleUpdate = (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? []
      const next = [...current]
      if (next[rowIndex]) {
        next[rowIndex] = { ...next[rowIndex], [columnId]: value }
      }
      return { ...(prev ?? {}), [gridId]: next }
    })
  }

  const handleAddEntry = (gridId: string, newRow: Record<string, unknown>) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? []
      return { ...(prev ?? {}), [gridId]: [...current, newRow] }
    })
  }

  const handleDeleteEntries = (gridId: string, rowIndices: number[]) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? []
      const filtered = current.filter((_, index) => !rowIndices.includes(index))
      return { ...(prev ?? {}), [gridId]: filtered }
    })
  }

  if (!normalizedTabs.length) {
    return null
  }

  return (
    <div className="w-full space-y-6 p-6 bg-card border border-border rounded-lg animate-in fade-in-0 duration-300">
      <Tabs
        value={activeTabId}
        onValueChange={setActiveTabId}
        className="w-full"
      >
        {normalizedTabs.length > 0 && (
          <TabsList className="bg-slate-50 dark:bg-black transition-all duration-300">
            {normalizedTabs.map((tab, index) => (
              <TabsTrigger
                key={tab.fieldName}
                value={tab.fieldName}
                className="animate-in fade-in-0 slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {normalizedTabs.map((tab) => (
          <TrackerTabContent
            key={tab.fieldName}
            tab={tab}
            sections={sections}
            grids={grids}
            fields={fields}
            localGridData={localGridData}
            handleUpdate={handleUpdate}
            handleAddEntry={handleAddEntry}
            handleDeleteEntries={handleDeleteEntries}
          />
        ))}
      </Tabs>
    </div>
  )
}

function TrackerTabContent({
  tab,
  sections,
  grids,
  fields,
  localGridData,
  handleUpdate,
  handleAddEntry,
  handleDeleteEntries,
}: {
  tab: TrackerTab
  sections: ITrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  localGridData: Record<string, Array<Record<string, unknown>>>
  handleUpdate: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void
  handleAddEntry: (gridId: string, newRow: Record<string, unknown>) => void
  handleDeleteEntries: (gridId: string, rowIndices: number[]) => void
}) {
  const tabSections = useMemo<
    Array<
      ITrackerSection & {
        grids: Array<TrackerGrid & { fields: TrackerField[] }>
      }
    >
  >(() => {
    return sections
      .filter((section) => section.tabId === tab.fieldName)
      .sort((a, b) => a.placeId - b.placeId)
      .map((section) => ({
        ...section,
        grids: grids
          .filter((grid) => grid.sectionId === section.fieldName)
          .sort((a, b) => a.placeId - b.placeId)
          .map((grid) => ({
            ...grid,
            fields: fields
              .filter(
                (field) =>
                  field.gridId ===
                  (grid.isShadow && grid.gridId ? grid.gridId : grid.id),
              )
              .sort((a, b) => a.placeId - b.placeId),
          })),
      }))
  }, [tab.fieldName, sections, grids, fields])

  return (
    <TabsContent
      key={tab.fieldName}
      value={tab.fieldName}
      className="space-y-6 mt-6"
    >
      {tabSections.map((section, index) => (
        <div
          key={section.fieldName}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TrackerSection
            section={section}
            gridData={localGridData}
            onUpdate={handleUpdate}
            onAddEntry={handleAddEntry}
            onDeleteEntries={handleDeleteEntries}
          />
        </div>
      ))}
    </TabsContent>
  )
}
