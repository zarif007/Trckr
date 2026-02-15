'use client'

import { useState, useCallback } from 'react'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'
import { TrackerDisplay } from '@/app/components/tracker-display'

/** Empty schema with one tab so the user has a canvas to start adding blocks. */
const INITIAL_SCHEMA: TrackerDisplayProps = {
  tabs: [{ id: 'overview_tab', name: 'Overview', placeId: 0 }],
  sections: [],
  grids: [],
  fields: [],
  layoutNodes: [],
  bindings: {},
  styles: undefined,
  dependsOn: [],
}

export default function TrackerFromScratchPage() {
  const [schema, setSchema] = useState<TrackerDisplayProps>(INITIAL_SCHEMA)

  const handleSchemaChange = useCallback((next: TrackerDisplayProps) => {
    setSchema(next)
  }, [])

  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Create tracker from scratch</h1>
        </div>
      </header>

      {/* Editor canvas */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <TrackerDisplay
          tabs={schema.tabs}
          sections={schema.sections}
          grids={schema.grids}
          fields={schema.fields}
          layoutNodes={schema.layoutNodes}
          bindings={schema.bindings}
          styles={schema.styles}
          dependsOn={schema.dependsOn}
          editMode
          onSchemaChange={handleSchemaChange}
        />
      </main>
    </div>
  )
}
