'use client'

import type { ComponentProps } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as SonnerToaster } from 'sonner'

import { cn } from '@/lib/utils'
import { theme as themeTokens } from '@/lib/theme'

type ToasterProps = ComponentProps<typeof SonnerToaster>

export function Toaster(props: ToasterProps) {
 const { theme = 'dark' } = useTheme()
 return (
 <SonnerToaster
 theme={theme === 'light' || theme === 'dark' ? theme : 'dark'}
 className="toaster group"
 toastOptions={{
 classNames: {
 toast: cn(
 'group toast bg-background text-foreground',
 themeTokens.patterns.floatingChrome,
 ),
 title: 'text-foreground font-medium',
 description: 'text-muted-foreground',
 success: cn('bg-background', themeTokens.patterns.floatingChrome),
 error: cn('border border-destructive/40 bg-background'),
 icon: '[&_svg]:text-muted-foreground',
 closeButton: cn(
 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
 themeTokens.patterns.floatingChrome,
 ),
 },
 }}
 {...props}
 />
 )
}
