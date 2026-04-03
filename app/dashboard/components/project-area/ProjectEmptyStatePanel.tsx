import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProjectEmptyStatePanel({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center py-12 sm:py-16",
        className,
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-sm border border-dashed border-border/45 bg-muted/10 px-6 py-10 text-center ">
        <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-dashed border-border/40 bg-background/60">
          <Icon className="h-8 w-8 text-muted-foreground/40" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground/90">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
