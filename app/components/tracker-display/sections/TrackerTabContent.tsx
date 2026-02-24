'use client'

import { useMemo, memo, type RefObject } from 'react'
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
  GridDataRecord,
} from '../types'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
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
  calculations?: Record<string, FieldCalculationRule>
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData: GridDataRecord
  gridDataRef?: RefObject<GridDataRecord> | null
  onUpdate: (gridId: string, rowIndex: number, columnId: string, value: unknown) => void
  onAddEntry: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries: (gridId: string, rowIndices: number[]) => void
}

function tabGridIds(tab: TrackerTab, sections: ITrackerSection[], grids: TrackerGrid[]): string[] {
  const sectionIdsInTab = new Set(
    sections.filter((s) => s.tabId === tab.id).map((s) => s.id)
  )
  return grids.filter((g) => sectionIdsInTab.has(g.sectionId)).map((g) => g.id)
}

function areTabContentPropsEqual(prev: TrackerTabContentProps, next: TrackerTabContentProps): boolean {
  if (
    prev.tab !== next.tab ||
    prev.sections !== next.sections ||
    prev.grids !== next.grids ||
    prev.fields !== next.fields ||
    prev.layoutNodes !== next.layoutNodes ||
    prev.bindings !== next.bindings ||
    prev.validations !== next.validations ||
    prev.calculations !== next.calculations ||
    prev.styles !== next.styles ||
    prev.dependsOn !== next.dependsOn ||
    prev.onUpdate !== next.onUpdate ||
    prev.onAddEntry !== next.onAddEntry ||
    prev.onDeleteEntries !== next.onDeleteEntries
  ) {
    return false
  }
  const gridIds = tabGridIds(next.tab, next.sections, next.grids)
  for (const id of gridIds) {
    if (prev.gridData[id] !== next.gridData[id]) return false
  }
  return true
}

export const TrackerTabContent = memo(function TrackerTabContent({
  tab,
  sections,
  grids,
  fields,
  layoutNodes,
  bindings,
  validations,
  calculations,
  styles,
  dependsOn,
  gridData,
  gridDataRef,
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

  // Edit mode: render flat Notion-like block editor. Pass onAddEntry/onDeleteEntries so Shared-tab grids (Field mappings, Rules) can add/delete rows.
  if (canEditLayout) {
    return (
      <TabsContent key={tab.id} value={tab.id} className={`${TAB_CONTENT_ROOT} data-[state=inactive]:hidden`} forceMount>
        <BlockEditor
          tab={tab}
          sections={sections}
          grids={grids}
          fields={fields}
          layoutNodes={layoutNodes}
          bindings={bindings}
          validations={validations}
          calculations={calculations}
          styles={styles}
          dependsOn={dependsOn}
          gridData={gridData}
          gridDataRef={gridDataRef}
          onUpdate={onUpdate}
          onAddEntry={onAddEntry}
          onDeleteEntries={onDeleteEntries}
        />
      </TabsContent>
    )
  }

  // Normal display mode: sections (including Field mappings and Rules grids on Shared tab) use normal data table
  return (
    <TabsContent key={tab.id} value={tab.id} className={`${TAB_CONTENT_ROOT} data-[state=inactive]:hidden`} forceMount>
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
              calculations={calculations}
              styles={styles}
              dependsOn={dependsOn}
              gridData={gridData}
              gridDataRef={gridDataRef}
              onUpdate={onUpdate}
              onAddEntry={onAddEntry}
              onDeleteEntries={onDeleteEntries}
            />
          </div>
        ))}
      </div>
    </TabsContent>
  )
}, areTabContentPropsEqual)
