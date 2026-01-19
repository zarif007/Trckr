'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackerDisplayProps } from './types'
import { TrackerSection } from './tracker-section'

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  examples,
  views,
}: TrackerDisplayProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.fieldName || '')

  useEffect(() => {
    if (tabs.length > 0) {
      const tabExists = tabs.some(tab => tab.fieldName === activeTabId);
      if (!activeTabId || !tabExists) {
        setActiveTabId(tabs[0].fieldName);
      }
    }
  }, [tabs, activeTabId])

  const [localExamples, setLocalExamples] = useState(examples)

  useEffect(() => {
    setLocalExamples(examples)
  }, [examples])

  const handleUpdate = (rowIndex: number, columnId: string, value: any) => {
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

  if (!tabs.length) {
    return null
  }

  return (
    <div className="w-full space-y-6 p-6 bg-card border border-border rounded-lg animate-in fade-in-0 duration-300">
      <Tabs
        value={activeTabId}
        onValueChange={setActiveTabId}
        className="w-full"
      >
        {tabs.length > 0 && (
          <TabsList className="bg-slate-50 dark:bg-black transition-all duration-300">
            {tabs.map((tab, index) => (
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

        {tabs.map((tab) => {
          const tabSections = sections
            .filter((section) => section.tabId === tab.fieldName)
            .map((section) => ({
              ...section,
              grids: grids
                .filter((grid) => grid.sectionId === section.fieldName)
                .map((grid) => ({
                  ...grid,
                  fields: fields.filter(
                    (field) => field.gridId === grid.fieldName
                  ),
                })),
            }))

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
                    onUpdate={handleUpdate}
                  />
                </div>
              ))}
            </TabsContent>
          )
        })}
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
