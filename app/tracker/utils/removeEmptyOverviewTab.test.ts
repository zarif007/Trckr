import { describe, expect, it } from 'vitest'
import type { TrackerLike } from '@/lib/validate-tracker'
import { removeEmptyOverviewTabIfUnused } from './removeEmptyOverviewTab'

describe('removeEmptyOverviewTabIfUnused', () => {
  it('removes overview_tab when unused and another tab has sections', () => {
    const tracker: TrackerLike = {
      tabs: [
        { id: 'overview_tab', name: 'Overview', placeId: 0 },
        { id: 'tasks_tab', name: 'Tasks', placeId: 1 },
      ],
      sections: [{ id: 'main_section', name: 'Main', tabId: 'tasks_tab', placeId: 0 }],
      grids: [],
      fields: [],
      layoutNodes: [],
      bindings: {},
      fieldRules: [],
    }
    const next = removeEmptyOverviewTabIfUnused(tracker)
    expect(next.tabs?.map((t) => t.id)).toEqual(['tasks_tab'])
  })

  it('keeps overview_tab when a section references it', () => {
    const tracker: TrackerLike = {
      tabs: [
        { id: 'overview_tab', name: 'Overview', placeId: 0 },
        { id: 'tasks_tab', name: 'Tasks', placeId: 1 },
      ],
      sections: [{ id: 'main_section', name: 'Main', tabId: 'overview_tab', placeId: 0 }],
      grids: [],
      fields: [],
      layoutNodes: [],
      bindings: {},
      fieldRules: [],
    }
    const next = removeEmptyOverviewTabIfUnused(tracker)
    expect(next.tabs?.map((t) => t.id)).toEqual(['overview_tab', 'tasks_tab'])
  })

  it('does not remove overview when it is the only tab', () => {
    const tracker: TrackerLike = {
      tabs: [{ id: 'overview_tab', name: 'Overview', placeId: 0 }],
      sections: [],
      grids: [],
      fields: [],
      layoutNodes: [],
      bindings: {},
      fieldRules: [],
    }
    const next = removeEmptyOverviewTabIfUnused(tracker)
    expect(next.tabs?.length).toBe(1)
  })
})
