'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerOptionMap,
  TrackerOptionTable,
} from './types'
import { TrackerSection } from './tracker-section'

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  layoutNodes = [],
  optionTables = [],
  optionMaps = [],
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(() => {
    return (tabs ?? [])
      .filter((tab) => !tab.config?.isHidden)
      .sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(
    normalizedTabs[0]?.id || '',
  )

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some(
        (tab) => tab.id === activeTabId,
      )
      if (!activeTabId || !tabExists) {
        setActiveTabId(normalizedTabs[0].id)
      }
    }
  }, [normalizedTabs, activeTabId])

  const [localGridData, setLocalGridData] = useState<
    Record<string, Array<Record<string, unknown>>>
  >({})

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
                key={tab.id}
                value={tab.id}
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
            key={tab.id}
            tab={tab}
            sections={sections}
            grids={grids}
            fields={fields}
            layoutNodes={layoutNodes}
            optionTables={optionTables}
            optionMaps={optionMaps}
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
  layoutNodes,
  optionTables,
  optionMaps,
  localGridData,
  handleUpdate,
  handleAddEntry,
  handleDeleteEntries,
}: {
  tab: TrackerTab
  sections: ITrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  optionTables: TrackerOptionTable[]
  optionMaps: TrackerOptionMap[]
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
  const tabSections = useMemo(() => {
    return sections
      .filter((section) => section.tabId === tab.id && !section.config?.isHidden)
      .sort((a, b) => a.placeId - b.placeId)
      .map((section) => ({
        ...section,
        grids: grids
          .filter((grid) => grid.sectionId === section.id)
          .sort((a, b) => a.placeId - b.placeId)
      }))
  }, [tab.id, sections, grids])

  return (
    <TabsContent
      key={tab.id}
      value={tab.id}
      className="space-y-6 mt-6"
    >
      {tabSections.map((section, index) => (
        <div
          key={section.id}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TrackerSection
            section={section}
            grids={section.grids}
            fields={fields}
            layoutNodes={layoutNodes}
            optionTables={optionTables}
            optionMaps={optionMaps}
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
