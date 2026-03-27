'use client'

import { useState, type RefObject } from 'react'
import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  FieldRules,
  GridDataRecord,
} from '../types'
import type { FieldCalculationRule, FieldValidationRule } from '@/lib/functions/types'
import { SectionBar, ViewBlockWrapper, GRIDS_CONTAINER, GRID_BLOCK_INNER } from '../layout'
import { GridBlockHeader, GridBlockContent } from '../blocks'

export interface TrackerSectionProps {
  tabId: string
  section: ITrackerSection
  grids: TrackerGrid[]
  allGrids?: TrackerGrid[]
  allFields?: TrackerField[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings?: TrackerBindings
  validations?: Record<string, FieldValidationRule[]>
  calculations?: Record<string, FieldCalculationRule>
  styles?: Record<string, StyleOverrides>
  fieldRules?: FieldRules
  gridData?: GridDataRecord
  gridDataRef?: RefObject<GridDataRecord> | null
  readOnly?: boolean
  onUpdate?: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void
  onAddEntry?: (gridId: string, newRow: Record<string, unknown>) => void
  onDeleteEntries?: (gridId: string, rowIndices: number[]) => void
}

export function TrackerSection({
  tabId,
  section,
  grids,
  allGrids,
  allFields,
  fields,
  layoutNodes,
  bindings = {},
  validations,
  calculations,
  styles,
  fieldRules,
  gridData,
  gridDataRef,
  readOnly,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: TrackerSectionProps) {
  const [collapsed, setCollapsed] = useState(section.config?.isCollapsedByDefault ?? false)

  return (
    <>
      <ViewBlockWrapper variant="section">
        <SectionBar
          name={section.name}
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed((c) => !c)}
        />
      </ViewBlockWrapper>
      {!collapsed && grids.length > 0 && (
        <div className={GRIDS_CONTAINER}>
          {grids.map((grid) => (
            <ViewBlockWrapper key={grid.id} variant="grid">
              <div className={GRID_BLOCK_INNER}>
                <GridBlockHeader grid={grid} name={grid.name} />
                <GridBlockContent
                  tabId={tabId}
                  grid={grid}
                  layoutNodes={layoutNodes}
                  allLayoutNodes={layoutNodes}
                  fields={fields}
                  allGrids={allGrids}
                  allFields={allFields}
                  bindings={bindings}
                  validations={validations}
                  calculations={calculations}
                  styles={styles}
                  fieldRules={fieldRules}
                  gridData={gridData}
                  gridDataRef={gridDataRef}
                  readOnly={readOnly}
                  onUpdate={onUpdate}
                  onAddEntry={onAddEntry}
                  onDeleteEntries={onDeleteEntries}
                  hideLabel
                />
              </div>
            </ViewBlockWrapper>
          ))}
        </div>
      )}
    </>
  )
}
