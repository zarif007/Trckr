'use client'

import type { ReactNode } from 'react'

export interface TrackerEditorPageLayoutProps {
  /** Page title shown in the sticky header. */
  title: string
  /** Main content (e.g. TrackerDisplay with editMode). */
  children: ReactNode
  /** Optional slot in the header (e.g. actions, breadcrumb). */
  headerSlot?: ReactNode
  /** Max width of main content; default 'max-w-5xl'. */
  maxWidth?: string
  /** Extra class for the outer wrapper. */
  className?: string
}

/**
 * Reusable full-page layout for tracker create/edit flows (from-scratch, future edit pages).
 * Sticky header + constrained main area so all editor pages share the same look and feel.
 */
export function TrackerEditorPageLayout({
  title,
  children,
  headerSlot,
  maxWidth = 'max-w-5xl',
  className = '',
}: TrackerEditorPageLayoutProps) {
  return (
    <div
      className={`min-h-screen font-sans bg-background text-foreground ${className}`.trim()}
    >
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className={`${maxWidth} mx-auto px-4 py-4 flex items-center justify-between`}
        >
          <h1 className="text-lg font-semibold">{title}</h1>
          {headerSlot}
        </div>
      </header>
      <main className={`${maxWidth} mx-auto px-4 py-8`}>{children}</main>
    </div>
  )
}
