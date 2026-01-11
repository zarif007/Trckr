'use client'

import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TrackerField {
  name: string
  fieldName: string
  type: 'string' | 'number' | 'date' | 'options' | 'boolean' | 'text'
  tab: string
  options?: string[]
}

interface TrackerTab {
  name: string
  type: 'table' | 'kanban'
}

interface TrackerDisplayProps {
  tabs: TrackerTab[]
  fields: TrackerField[]
  examples: Array<Record<string, any>>
  views: string[]
}

export function TrackerDisplay({
  tabs,
  fields,
  examples,
  views,
}: TrackerDisplayProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.name || '')
  const [formData, setFormData] = useState<Record<string, any>>(
    examples[0] || {}
  )

  // Get fields for the active tab
  const activeTabFields = fields.filter((field) => field.tab === activeTab)

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
          <Input
            key={field.fieldName}
            type="date"
            placeholder={field.name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="bg-background text-foreground"
          />
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

  const renderTableView = () => {
    if (examples.length === 0) return null

    return (
      <div className="overflow-x-auto border rounded-lg border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {activeTabFields.map((field) => (
                <TableHead key={field.fieldName} className="text-foreground">
                  {field.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {examples.map((example, idx) => (
              <TableRow key={idx} className="hover:bg-muted/50">
                {activeTabFields.map((field) => (
                  <TableCell
                    key={`${idx}-${field.fieldName}`}
                    className="text-foreground"
                  >
                    {renderCellValue(example[field.fieldName], field.type)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

  const renderKanbanView = () => {
    if (examples.length === 0) return null

    // For kanban, we'll group by first options field if it exists
    const optionsField = activeTabFields.find((f) => f.type === 'options')

    if (!optionsField) {
      return (
        <div className="text-muted-foreground text-sm">
          Kanban view requires an options field to group by
        </div>
      )
    }

    const groups = optionsField.options || []
    const cardFields = activeTabFields.filter(
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

  const isTableTab = tabs.find((t) => t.name === activeTab)?.type === 'table'

  return (
    <Card className="p-6 mt-2 space-y-6 bg-card border-border">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.name}
            variant={activeTab === tab.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.name)}
            className="rounded-b-none"
          >
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Form Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Add New Entry
        </h3>
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
          {activeTabFields.map((field) => (
            <div key={field.fieldName}>
              {field.type !== 'boolean' && (
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {field.name}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}
          <Button className="w-full mt-4">Add Entry</Button>
        </div>
      </div>

      {/* Data Preview Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Data Preview ({isTableTab ? 'Table View' : 'Kanban View'})
        </h3>
        {isTableTab ? renderTableView() : renderKanbanView()}
      </div>

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
    </Card>
  )
}
