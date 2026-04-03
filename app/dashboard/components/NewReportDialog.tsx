"use client";

import { FileText } from "lucide-react";
import { NewTrackerBackedItemDialog } from "@/app/insights/components/NewTrackerBackedItemDialog";

interface NewReportDialogProps {
  projectId: string;
  moduleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (msg: string) => void;
  /** Called after the report is created (before navigation). */
  onCreated?: () => void | Promise<void>;
}

export function NewReportDialog(props: NewReportDialogProps) {
  return (
    <NewTrackerBackedItemDialog
      {...props}
      resource="report"
      title={
        <>
          <FileText className="h-4 w-4" />
          New report
        </>
      }
      nameInputId="report-name"
      namePlaceholder="e.g. Monthly sales overview"
      createFailedMessage="Failed to create report"
    />
  );
}
