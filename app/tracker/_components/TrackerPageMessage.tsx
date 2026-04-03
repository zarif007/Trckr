"use client";

import { Button } from "@/components/ui/button";

export function TrackerPageMessage({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen font-sans bg-background text-foreground flex items-center justify-center p-4 pt-16">
      <div className="flex w-full max-w-md flex-col items-stretch gap-4 rounded-sm border border-border/50 bg-card px-5 py-4 text-center sm:flex-row sm:items-center sm:text-left">
        <p className="flex-1 text-sm text-muted-foreground leading-snug">
          {message}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
