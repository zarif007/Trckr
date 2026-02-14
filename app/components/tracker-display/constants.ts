import type { GridType } from './types'

export const VIEW_LABEL: Record<GridType, string> = {
  div: 'Form',
  table: 'Table',
  kanban: 'Kanban',
  calendar: 'Calendar',
  timeline: 'Timeline',
}

export function getViewLabel(type: GridType): string {
  return VIEW_LABEL[type] ?? 'View'
}
