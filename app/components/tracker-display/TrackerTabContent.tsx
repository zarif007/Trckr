'use client'

import { useMemo } from 'react'
import { TabsContent } from '@/components/ui/tabs'
import type {
  TrackerTab,
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import { TrackerSection } from './TrackerSection'
import { useCanEditLayout, BlockEditor } from './edit-mode'

export interface TrackerTabContentProps {
  tab: TrackerTab
  sections: ITrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData: Record<string, Array<Record<string, unknown>>>
  onUpdate: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries: (gridId: string, rowIndices: number[]) => void
}

export function TrackerTabContent({
  tab,
  sections,
  grids,
  fields,
  layoutNodes,
  bindings,
  styles,
  dependsOn,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerTabContentProps) {
  const canEditLayout = useCanEditLayout()

  const tabSections = useMemo(
    () =>
      sections
        .filter((section) => section.tabId === tab.id && !section.config?.isHidden)
        .sort((a, b) => a.placeId - b.placeId)
        .map((section) => ({
          ...section,
          grids: grids
            .filter((grid) => grid.sectionId === section.id)
            .sort((a, b) => a.placeId - b.placeId),
        })),
    [tab.id, sections, grids]
  )

  // Edit mode: render flat Notion-like block editor
  if (canEditLayout) {
    return (
      <TabsContent key={tab.id} value={tab.id} className="mt-6">
        <BlockEditor
          tab={tab}
          sections={sections}
          grids={grids}
          fields={fields}
          layoutNodes={layoutNodes}
          bindings={bindings}
          styles={styles}
          dependsOn={dependsOn}
          gridData={gridData}
          onUpdate={onUpdate}
          onAddEntry={onAddEntry}
          onDeleteEntries={onDeleteEntries}
        />
      </TabsContent>
    )
  }

  // Normal display mode
  return (
    <TabsContent key={tab.id} value={tab.id} className="space-y-6 mt-6">
      {tabSections.map((section, index) => (
        <div
          key={section.id}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 space-y-2"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TrackerSection
            tabId={tab.id}
            section={section}
            grids={section.grids}
            allGrids={grids}
            allFields={fields}
            fields={fields}
            layoutNodes={layoutNodes}
            bindings={bindings}
            styles={styles}
            dependsOn={dependsOn}
            gridData={gridData}
            onUpdate={onUpdate}
            onAddEntry={onAddEntry}
            onDeleteEntries={onDeleteEntries}
          />
        </div>
      ))}
    </TabsContent>
  )
}
