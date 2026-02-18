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
} from '../types'
import type { FieldValidationRule } from '@/lib/functions/types'
import { TrackerSection } from './TrackerSection'
import { useCanEditLayout, BlockEditor } from '../edit-mode'
import { TAB_CONTENT_ROOT, TAB_CONTENT_INNER, SECTION_GROUP_ROOT } from '../layout'

export interface TrackerTabContentProps {
  tab: TrackerTab
  sections: ITrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
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
  validations,
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

  // Edit mode: render flat Notion-like block editor (full width so BlockEditor's ml-auto right-aligns).
  // Do not pass onAddEntry/onDeleteEntries so Add Entry / add-data buttons are hidden.
  if (canEditLayout) {
    return (
      <TabsContent key={tab.id} value={tab.id} className={TAB_CONTENT_ROOT}>
        <BlockEditor
          tab={tab}
          sections={sections}
          grids={grids}
          fields={fields}
          layoutNodes={layoutNodes}
          bindings={bindings}
          validations={validations}
          styles={styles}
          dependsOn={dependsOn}
          gridData={gridData}
          onUpdate={onUpdate}
        />
      </TabsContent>
    )
  }

  // Normal display mode: same vertical structure as edit — TAB_CONTENT_INNER applies space-y-6 to section list
  return (
    <TabsContent key={tab.id} value={tab.id} className={TAB_CONTENT_ROOT}>
      <div className={TAB_CONTENT_INNER}>
        {tabSections.map((section) => (
          <div key={section.id} className={SECTION_GROUP_ROOT}>
            <TrackerSection
              tabId={tab.id}
              section={section}
              grids={section.grids}
              allGrids={grids}
              allFields={fields}
              fields={fields}
              layoutNodes={layoutNodes}
              bindings={bindings}
              validations={validations}
              styles={styles}
              dependsOn={dependsOn}
              gridData={gridData}
              onUpdate={onUpdate}
              onAddEntry={onAddEntry}
              onDeleteEntries={onDeleteEntries}
            />
          </div>
        ))}
      </div>
    </TabsContent>
  )
}
