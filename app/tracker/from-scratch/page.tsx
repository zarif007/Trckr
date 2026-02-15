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
    <TrackerEditorPageLayout title="Create tracker from scratch">
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
    </TrackerEditorPageLayout>
  )
}
