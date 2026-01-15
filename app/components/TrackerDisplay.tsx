'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { FieldInput } from './FieldInput'

type TrackerFieldType =
  | 'string'
  | 'number'
  | 'date'
  | 'options'
  | 'boolean'
  | 'text'

interface TrackerTab {
  name: string
  fieldName: string
}

interface TrackerSection {
  name: string
  fieldName: string
  tabId: string
}

interface TrackerGrid {
  name: string
  fieldName: string
  type: 'table' | 'kanban'
  sectionId: string
}

interface TrackerField {
  name: string
  fieldName: string
  type: TrackerFieldType
  gridId: string
  options?: string[]
}

interface TrackerDisplayProps {
  tabs: TrackerTab[]
  sections: TrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  examples: Array<Record<string, any>>
  views: string[]
}

export function TrackerDisplay({
  tabs,
  sections,
  grids,
  fields,
  examples,
  views,
}: TrackerDisplayProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.fieldName || '')
  const [formData, setFormData] = useState<Record<string, any>>(
    examples[0] || {}
  )
  const [showDialog, setShowDialog] = useState(false)

  // Build hierarchy from flat structure
  const activeTab = tabs.find((tab) => tab.fieldName === activeTabId) || tabs[0]
  const activeSections = sections
    .filter((section) => section.tabId === activeTab?.fieldName)
    .map((section) => ({
      ...section,
      grids: grids
        .filter((grid) => grid.sectionId === section.fieldName)
        .map((grid) => ({
          ...grid,
          fields: fields.filter((field) => field.gridId === grid.fieldName),
        })),
    }))

  // Render form field based on type
  const renderField = (field: TrackerField) => {
    const value = formData[field.fieldName] ?? ''
    const handleChange = (newValue: any) => {
      setFormData((prev) => ({
        ...prev,
        [field.fieldName]: newValue,
      }))
    }

    return (
      <FieldInput
        key={field.fieldName}
        field={{
          name: field.name,
          fieldName: field.fieldName,
          type: field.type,
          options: field.options,
        }}
        value={value}
        onChange={handleChange}
      />
    )
  }

  const renderTableGrid = (grid: TrackerGrid & { fields: TrackerField[] }) => {
    if (examples.length === 0 || grid.fields.length === 0) return null

    // Create field metadata for the DataTable
    const fieldMetadata: Record<string, any> = {}
    grid.fields.forEach((field) => {
      fieldMetadata[field.fieldName] = {
        name: field.name,
        type: field.type,
        options: field.options,
      }
    })

    // Create columns dynamically from grid fields
    const columns: ColumnDef<Record<string, any>>[] = grid.fields.map(
      (field) => ({
        accessorKey: field.fieldName,
        header: field.name,
        cell: ({ row }) => {
          const value = row.getValue(field.fieldName)
          return renderCellValue(value, field.type)
        },
      })
    )

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button size="sm" variant="outline">
            Add Entry
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={examples}
          fieldMetadata={fieldMetadata}
        />
      </div>
    )
  }

  const renderCellValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) return '-'

    switch (fieldType) {
      case 'boolean':
        return (
          <div className="flex items-center justify-center">
            <Checkbox checked={value || false} disabled />
          </div>
        )
      case 'options':
        return <Badge variant="secondary">{value}</Badge>
      case 'date':
        return new Date(value).toLocaleDateString()
      default:
        return String(value)
    }
  }

  const renderKanbanGrid = (grid: TrackerGrid & { fields: TrackerField[] }) => {
    if (examples.length === 0) return null

    const optionsField = grid.fields.find((f) => f.type === 'options')

    if (!optionsField) {
      return (
        <div className="text-muted-foreground text-sm">
          Kanban view requires an options field to group by
        </div>
      )
    }

    const groups = optionsField.options || []
    const cardFields = grid.fields.filter(
      (f) => f.fieldName !== optionsField.fieldName
    )

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groups.map((group) => {
          const cardsInGroup = examples.filter(
            (ex) => ex[optionsField.fieldName] === group
          )
          return (
            <div key={group} className="shrink-0 w-80">
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-foreground">{group}</h3>
              </div>
              <div className="space-y-3">
                {cardsInGroup.map((card, idx) => (
                  <Card
                    key={idx}
                    className="p-4 bg-card border-border hover:shadow-md transition-shadow"
                  >
                    {cardFields.map((field) => (
                      <div key={field.fieldName} className="mb-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          {field.name}
                        </p>
                        <p className="text-sm text-foreground">
                          {renderCellValue(card[field.fieldName], field.type)}
                        </p>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderGrid = (grid: TrackerGrid & { fields: TrackerField[] }) => {
    switch (grid.type) {
      case 'table':
        return renderTableGrid(grid)
      case 'kanban':
        return renderKanbanGrid(grid)
      default:
        return null
    }
  }

  const trackerContent = (
    <>
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.fieldName}
            variant={
              activeTab?.fieldName === tab.fieldName ? 'default' : 'outline'
            }
            size="sm"
            onClick={() => setActiveTabId(tab.fieldName)}
            className="rounded-b-none"
          >
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Sections & Grids */}
      {activeSections.map((section) => (
        <div key={section.fieldName} className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {section.name}
          </h3>
          <div className="space-y-6">
            {section.grids.map((grid) => (
              <div key={grid.fieldName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {grid.name}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {grid.type}
                    </p>
                  </div>
                </div>
                {renderGrid(grid)}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Views Summary */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Available Views
        </h3>
        <div className="flex flex-wrap gap-2">
          {views.map((view) => (
            <Badge key={view} variant="secondary">
              {view}
            </Badge>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div>
      {/* Preview Button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowDialog(true)}
          size="lg"
          className="cursor-pointer"
        >
          Preview Tracker
        </Button>
      </div>

      {/* Tracker Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="!max-w-7xl rounded-xl max-h-screen overflow-y-auto p-0">
          <div className="overflow-y-auto">
            <Card className="p-6 space-y-6 bg-card border-border">
              {trackerContent}
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
