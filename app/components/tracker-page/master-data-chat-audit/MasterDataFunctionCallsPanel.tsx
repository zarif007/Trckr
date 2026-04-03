"use client";

import { Box, Check } from "lucide-react";
import {
  formatBindingActionSummary,
  MASTER_DATA_AUDIT_FUNCTIONS,
  type MasterDataBuildAudit,
} from "@/lib/master-data/chat-audit";
import { AuditPanelShell } from "./AuditPanelShell";

const PANEL_TITLE = "Function calls";

interface MasterDataFunctionCallsPanelProps {
  audit: MasterDataBuildAudit;
  className?: string;
}

/**
 * Lists logical “function calls” for the master data binding pass (currently one row per
 * `MasterDataBindingAction`, all labeled with {@link MASTER_DATA_AUDIT_FUNCTIONS.LOOKUP_REUSABLE}).
 */
export function MasterDataFunctionCallsPanel({
  audit,
  className,
}: MasterDataFunctionCallsPanelProps) {
  if (audit.actions.length === 0) return null;

  return (
    <AuditPanelShell title={PANEL_TITLE} icon={Box} className={className}>
      <div className="flex flex-col gap-1">
        {audit.actions.map((action, i) => (
          <div
            key={`${action.trackerId}-${action.type}-${i}`}
            className="flex items-start gap-2.5 text-xs p-1.5 rounded-sm min-w-0 text-foreground/80 bg-background/30"
          >
            <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-medium font-mono text-[11px]">
                {MASTER_DATA_AUDIT_FUNCTIONS.LOOKUP_REUSABLE}
              </span>
              <p className="text-muted-foreground text-[11px] mt-0.5 break-words">
                {formatBindingActionSummary(action)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AuditPanelShell>
  );
}
