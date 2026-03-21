import * as React from "react"

import { cn } from "@/lib/utils"
import { theme } from "@/lib/theme"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        theme.patterns.inputBase,
        "placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
