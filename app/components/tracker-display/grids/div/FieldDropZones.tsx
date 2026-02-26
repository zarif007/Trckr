'use client'

import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { fieldDropZoneId } from './drag-utils'

const FieldDropZones = memo(function FieldDropZones({
  gridId,
  fieldId,
  enabled,
}: {
  gridId: string
  fieldId: string
  enabled: boolean
}) {
  const leftZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'left') })
  const rightZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'right') })
  const topZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'above') })
  const bottomZone = useDroppable({ id: fieldDropZoneId(gridId, fieldId, 'below') })

  if (!enabled) return null

  return (
    <>
      <div ref={topZone.setNodeRef} className="pointer-events-none absolute left-0 right-0 top-0 h-[20%]" />
      <div ref={bottomZone.setNodeRef} className="pointer-events-none absolute left-0 right-0 bottom-0 h-[20%]" />
      <div ref={leftZone.setNodeRef} className="pointer-events-none absolute left-0 top-[20%] bottom-[20%] w-1/2" />
      <div ref={rightZone.setNodeRef} className="pointer-events-none absolute right-0 top-[20%] bottom-[20%] w-1/2" />
    </>
  )
})

export { FieldDropZones }
