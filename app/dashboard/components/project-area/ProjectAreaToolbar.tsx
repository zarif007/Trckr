import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  projectAreaToolbarBreadcrumbSlotClass,
  projectAreaToolbarClass,
} from './tokens'

export function ProjectAreaToolbar({
  breadcrumb,
  actions,
  className,
}: {
  breadcrumb: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn(projectAreaToolbarClass, className)}>
      <div className={projectAreaToolbarBreadcrumbSlotClass}>{breadcrumb}</div>
      {actions != null ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
