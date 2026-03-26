'use client'

import { PackagePlus } from 'lucide-react'
import { selectCreatedBindingActions, type MasterDataBuildAudit } from '@/lib/master-data/chat-audit'
import { AuditPanelShell } from './AuditPanelShell'

const PANEL_TITLE = 'Master data trackers'

interface MasterDataCreatedTrackersPanelProps {
  audit: MasterDataBuildAudit
  className?: string
}

/** Rows for trackers newly created in the Master Data module (`type === 'create'`). */
export function MasterDataCreatedTrackersPanel({ audit, className }: MasterDataCreatedTrackersPanelProps) {
  const created = selectCreatedBindingActions(audit)
  if (created.length === 0) return null

  return (
    <AuditPanelShell title={PANEL_TITLE} icon={PackagePlus} className={className}>
      <div className="flex flex-col gap-1">
        {created.map((action, i) => (
          <div
            key={`created-${action.trackerId}-${i}`}
            className="flex items-start gap-2.5 text-xs p-1.5 rounded-md min-w-0 text-foreground/80 bg-background/30"
          >
            <PackagePlus className="h-3 w-3 text-emerald-600/80 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{action.name}</span>
              {action.key ? (
                <span className="text-muted-foreground font-mono text-[11px] ml-1.5">({action.key})</span>
              ) : null}
              <p className="text-muted-foreground font-mono text-[10px] mt-0.5 break-all">{action.trackerId}</p>
            </div>
          </div>
        ))}
      </div>
    </AuditPanelShell>
  )
}
