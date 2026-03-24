import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { projectAreaBreadcrumbNavClass } from './tokens'

export function ProjectBreadcrumbNav({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <nav
      className={cn(projectAreaBreadcrumbNavClass, className)}
      aria-label="Breadcrumb"
    >
      {children}
    </nav>
  )
}
