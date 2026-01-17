'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrackerDisplayProps } from './types'
import { TrackerSection } from './tracker-section'

export function TrackerDisplay({
  tabs,
  sections,
  grids,
  fields,
  examples,
  views,
}: TrackerDisplayProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.fieldName || '')
  const [showDialog, setShowDialog] = useState(false)

  const trackerContent = (
    <>
      <Tabs
        value={activeTabId}
        onValueChange={setActiveTabId}
        className="w-full"
      >
        <TabsList className="bg-slate-50 dark:bg-black">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.fieldName} value={tab.fieldName}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

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
              {tabSections.map((section) => (
                <TrackerSection
                  key={section.fieldName}
                  section={section}
                  examples={examples}
                />
              ))}
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="pt-4 border-t">
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
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowDialog(true)}
          size="lg"
          className="cursor-pointer"
        >
          Preview Tracker
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="!max-w-7xl rounded-xl max-h-screen overflow-y-auto p-0 border-0">
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
