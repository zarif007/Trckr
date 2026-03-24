import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  projectAreaTileIcon,
  projectAreaTileIconList,
  projectAreaTileIconShell,
  projectAreaTileIconShellList,
} from './tokens'

export function ProjectFolderTileIcon({
  icon: Icon,
  listHighlight,
  className,
}: {
  icon: LucideIcon
  listHighlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        projectAreaTileIconShell,
        listHighlight && projectAreaTileIconShellList,
        className,
      )}
    >
      <Icon
        className={cn(
          projectAreaTileIcon,
          listHighlight && projectAreaTileIconList,
        )}
      />
    </div>
  )
}
