"use client";

import { BarChart2 } from "lucide-react";
import { NewTrackerBackedItemDialog } from "@/app/insights/components/NewTrackerBackedItemDialog";

interface NewAnalysisDialogProps {
  projectId: string;
  moduleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (msg: string) => void;
  onCreated?: () => void | Promise<void>;
}

export function NewAnalysisDialog(props: NewAnalysisDialogProps) {
  return (
    <NewTrackerBackedItemDialog
      {...props}
      resource="analysis"
      title={
        <>
          <BarChart2 className="h-4 w-4" />
          New analysis
        </>
      }
      nameInputId="analysis-name"
      namePlaceholder="e.g. Q1 performance deep dive"
      createFailedMessage="Failed to create analysis"
    />
  );
}
