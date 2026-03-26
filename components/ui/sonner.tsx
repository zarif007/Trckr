'use client'

import type { ComponentProps } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as SonnerToaster } from 'sonner'

type ToasterProps = ComponentProps<typeof SonnerToaster>

export function Toaster(props: ToasterProps) {
  const { theme = 'dark' } = useTheme()
  return (
    <SonnerToaster
      theme={theme === 'light' || theme === 'dark' ? theme : 'dark'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast border-border bg-background text-foreground shadow-md',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
          success: 'border-border bg-background',
          error: 'border-destructive/40 bg-background',
          icon: '[&_svg]:text-muted-foreground',
          closeButton:
            'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
        },
      }}
      {...props}
    />
  )
}
