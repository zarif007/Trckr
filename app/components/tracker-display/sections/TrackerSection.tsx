'use client'

import { useState } from 'react'
import {
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from '../types'
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
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  gridData?: Record<string, Array<Record<string, unknown>>>
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
  styles,
  dependsOn,
  gridData,
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
                  styles={styles}
                  dependsOn={dependsOn}
                  gridData={gridData}
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
