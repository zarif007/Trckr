import type { TrackerFormAction } from '@/app/components/tracker-display/types'
import type { GridDataSnapshot } from '../TrackerPanel'
import type { Message, TrackerResponse } from '../../hooks/useTrackerChat'

export type { TrackerFormAction, TrackerResponse, Message, GridDataSnapshot }

export const MIN_LEFT_PX = 320
export const MIN_RIGHT_PX = 360
export const DRAFT_STATUS_TAG = 'Draft'

export interface TrackerEditorViewProps {
  initialSchema?: TrackerResponse
  initialGridData?: GridDataSnapshot | null
  onSaveTracker?: (schema: TrackerResponse) => Promise<void>
  initialEditMode?: boolean
  initialChatOpen?: boolean
  trackerId?: string | null
  instanceType?: 'SINGLE' | 'MULTI'
  instanceId?: string | null
  autoSave?: boolean
  initialFormStatus?: string | null
  initialConversationId?: string | null
  initialMessages?: Message[]
  versionControl?: boolean
  initialBranchName?: string | null
  onBranchChange?: (branchName: string) => void
  pageMode?: 'full' | 'data' | 'schema'
  primaryNavAction?: { label: string; href: string } | null
  showPanelUtilities?: boolean
  schemaAutoSave?: boolean
}

export type ChatWindow = { id: string; title: string }

export interface LoadedSnapshot {
  id: string
  label: string | null
  data: GridDataSnapshot
  updatedAt?: string
  formStatus?: string | null
}
