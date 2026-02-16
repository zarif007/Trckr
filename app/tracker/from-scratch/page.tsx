'use client'

import { TrackerDisplay } from '@/app/components/tracker-display'
import {
  INITIAL_TRACKER_SCHEMA,
  useEditableTrackerSchema,
  TrackerEditorPageLayout,
} from '@/app/components/tracker-display/tracker-editor'

export default function TrackerFromScratchPage() {
  const { schema, onSchemaChange } = useEditableTrackerSchema(
    INITIAL_TRACKER_SCHEMA
  )

  return (
    <div className="py-32 px-2 max-w-7xl mx-auto">
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
        onSchemaChange={onSchemaChange}
      />
    </div>
  )
}
