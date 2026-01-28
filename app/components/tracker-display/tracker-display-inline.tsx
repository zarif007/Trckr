'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField
} from './types'
import { TrackerSection } from './tracker-section'

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  examples,
  gridData,
  views,
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(() => {
    const sharedFieldName = 'shared'
    const tabsWithoutShared = (tabs ?? []).filter((t) => t?.fieldName !== sharedFieldName)
    const maxPlaceId = tabsWithoutShared.reduce(
      (acc, t) => Math.max(acc, typeof t?.placeId === 'number' ? t.placeId : 0),
      0
    )

    const existingShared = (tabs ?? []).find((t) => t?.fieldName === sharedFieldName)
    const sharedTab = existingShared
      ? { ...existingShared, name: existingShared.name || 'Shared', placeId: maxPlaceId + 1 }
      : { name: 'Shared', fieldName: sharedFieldName, placeId: maxPlaceId + 1 }

    return [...tabsWithoutShared, sharedTab]
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(normalizedTabs[0]?.fieldName || '')

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some(tab => tab.fieldName === activeTabId);
      if (!activeTabId || !tabExists) {
        setActiveTabId(normalizedTabs[0].fieldName);
      }
    }
  }, [normalizedTabs, activeTabId])

  const [localExamples, setLocalExamples] = useState(examples)
  const [localGridData, setLocalGridData] = useState<Record<string, Array<Record<string, unknown>>>>(
    gridData ?? {}
  )

  useEffect(() => {
    setLocalExamples(examples)
  }, [examples])

  useEffect(() => {
    setLocalGridData(gridData ?? {})
  }, [gridData])

  const handleUpdate = (gridId: string, rowIndex: number, columnId: string, value: unknown) => {
    // If this grid has an explicit dataset, update it; otherwise update main examples.
    if (localGridData?.[gridId]) {
      setLocalGridData((prev) => {
        const current = prev?.[gridId] ?? []
        const next = [...current]
        if (next[rowIndex]) {
          next[rowIndex] = { ...next[rowIndex], [columnId]: value }
        }
        return { ...(prev ?? {}), [gridId]: next }
      })
      return
    }

    setLocalExamples((prev) => {
      const newData = [...prev]
      if (newData[rowIndex]) {
        newData[rowIndex] = {
          ...newData[rowIndex],
          [columnId]: value,
        }
      }
      return newData
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
            {[...normalizedTabs].sort((a, b) => a.placeId - b.placeId).map((tab, index) => (
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

        {[...normalizedTabs].sort((a, b) => a.placeId - b.placeId).map((tab) => (
          <TrackerTabContent
            key={tab.fieldName}
            tab={tab}
            sections={sections}
            grids={grids}
            fields={fields}
            localExamples={localExamples}
            localGridData={localGridData}
            handleUpdate={handleUpdate}
          />
        ))}
      </Tabs>

      {views.length > 0 && (
        <div className="pt-4 border-t animate-in fade-in-0 duration-500" style={{ animationDelay: '200ms' }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Available Views
          </h3>
          <div className="flex flex-wrap gap-2">
            {views.map((view, index) => (
              <Badge
                key={view}
                variant="secondary"
                className="animate-in fade-in-0 zoom-in-95 duration-200"
                style={{ animationDelay: `${300 + index * 50}ms` }}
              >
                {view}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TrackerTabContent({
  tab,
  sections,
  grids,
  fields,
  localExamples,
  localGridData,
  handleUpdate
}: {
  tab: TrackerTab;
  sections: ITrackerSection[];
  grids: TrackerGrid[];
  fields: TrackerField[];
  localExamples: Array<Record<string, unknown>>;
  localGridData: Record<string, Array<Record<string, unknown>>>;
  handleUpdate: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void;
}) {
  const tabSections = useMemo<
    Array<ITrackerSection & { grids: Array<TrackerGrid & { fields: TrackerField[] }> }>
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
                (field) => field.gridId === (grid.isShadow && grid.gridId ? grid.gridId : grid.id)
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
            examples={localExamples}
            gridData={localGridData}
            onUpdate={handleUpdate}
          />
        </div>
      ))}
    </TabsContent>
  )
}
