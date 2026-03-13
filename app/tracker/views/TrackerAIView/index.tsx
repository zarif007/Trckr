'use client'

import { ShareTrackerDialog } from '@/app/components/teams'
import { useTrackerAIView } from './useTrackerAIView'
import { TrackerAIMobileLayout } from './TrackerAIMobileLayout'
import { TrackerAIDesktopLayout } from './TrackerAIDesktopLayout'
import type { TrackerEditorViewProps } from './types'

export type { TrackerEditorViewProps } from './types'

export function TrackerAIView(props: TrackerEditorViewProps = {}) {
  const state = useTrackerAIView(props)

  return (
    <>
      <TrackerAIMobileLayout {...state} />
      <TrackerAIDesktopLayout {...state} />
      <ShareTrackerDialog
        open={state.shareDialogOpen}
        onOpenChange={state.setShareDialogOpen}
        trackerName={state.trackerName}
        onShare={(teamId, defaultRole) => {
          console.info('Share tracker with team', teamId, defaultRole)
        }}
      />
    </>
  )
}
