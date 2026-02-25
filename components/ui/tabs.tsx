'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        theme.border.subtle,
        theme.radius.md,
        'inline-flex w-fit items-center gap-1 border bg-muted/70 p-0.5 backdrop-blur transition-colors',
        'ring-1 ring-inset ring-border/30',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap px-2.5 py-1 text-sm font-semibold transition-[color,background,border,transform]',
        theme.radius.md,
        theme.text.muted,
        'border border-transparent',
        'hover:bg-background/60 hover:text-foreground/90',
        'data-[state=active]:bg-background/90 data-[state=active]:text-foreground data-[state=active]:border-border/60 data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)]',
        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none',
        'active:scale-[0.985]',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
