'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DataTable } from '@/components/ui/data-table'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

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

    switch (field.type) {
      case 'string':
        return (
          <Input
            key={field.fieldName}
            placeholder={field.name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-background text-foreground"
          />
        )
      case 'number':
        return (
          <Input
            key={field.fieldName}
            type="number"
            placeholder={field.name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-background text-foreground"
          />
        )
      case 'date':
        return (
          <Popover key={field.fieldName}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal bg-background text-foreground"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : field.name}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => {
                  if (date) {
                    handleChange(date.toISOString().split('T')[0])
                  }
                }}
                disabled={(date) =>
                  date > new Date() || date < new Date('1900-01-01')
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      case 'text':
        return (
          <Textarea
            key={field.fieldName}
            placeholder={field.name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-background text-foreground"
            rows={3}
          />
        )
      case 'boolean':
        return (
          <div key={field.fieldName} className="flex items-center gap-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={handleChange}
              id={field.fieldName}
            />
            <label htmlFor={field.fieldName} className="text-sm font-medium">
              {field.name}
            </label>
          </div>
        )
      case 'options':
        return (
          <Select
            key={field.fieldName}
            value={value}
            onValueChange={handleChange}
          >
            <SelectTrigger className="bg-background text-foreground">
              <SelectValue placeholder={field.name} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return null
    }
  }

  const renderTableGrid = (grid: TrackerGrid & { fields: TrackerField[] }) => {
    if (examples.length === 0 || grid.fields.length === 0) return null

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
        <DataTable columns={columns} data={examples} />
      </div>
    )
  }

  const renderCellValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) return '-'

    switch (fieldType) {
      case 'boolean':
        return value ? (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Yes
          </Badge>
        ) : (
          <Badge variant="outline">No</Badge>
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
