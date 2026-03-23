'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderPlus,
  FileText,
  BarChart3,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { NewModuleButton } from './NewModuleButton'
import { NewTrackerDialog } from './NewTrackerDialog'
import { NewReportDialog } from './NewReportDialog'
import type { SystemFileType } from '../dashboard-context'
import { SYSTEM_FILE_LABELS } from '../dashboard-context'

export type CreateDropdownVariant = 'toolbar' | 'empty'

type CreateDropdownBaseProps = {
  projectId: string
  variant?: CreateDropdownVariant
  onError?: (message: string) => void
}

type CreateDropdownProjectProps = CreateDropdownBaseProps & {
  moduleId?: never
  availableConfigTypes?: never
  onTrackerCreated?: (trackerId: string) => void
  onReportCreated?: () => void | Promise<void>
  onAddConfig?: never
}

type CreateDropdownModuleProps = CreateDropdownBaseProps & {
  moduleId: string
  availableConfigTypes?: SystemFileType[]
  onTrackerCreated?: (trackerId: string) => void
  onReportCreated?: () => void | Promise<void>
  onAddConfig?: (type: SystemFileType) => void
  addingConfig?: boolean
}

type CreateDropdownDashboardProps = {
  projectId?: never
  variant?: CreateDropdownVariant
  onError?: (message: string) => void
  onCreateProjectClick?: () => void
  onTrackerCreated?: (trackerId: string) => void
}

export type CreateDropdownProps =
  | CreateDropdownProjectProps
  | CreateDropdownModuleProps
  | CreateDropdownDashboardProps

function isModuleProps(
  props: CreateDropdownProps,
): props is CreateDropdownModuleProps {
  return 'moduleId' in props && props.moduleId != null
}

function isDashboardProps(
  props: CreateDropdownProps,
): props is CreateDropdownDashboardProps {
  return 'onCreateProjectClick' in props
}

export function CreateDropdown(props: CreateDropdownProps) {
  const { variant = 'toolbar', onError, onTrackerCreated } = props
  const onReportCreated =
    'onReportCreated' in props ? props.onReportCreated : undefined

  const projectId = 'projectId' in props ? props.projectId : undefined
  const isDashboard = isDashboardProps(props)
  const onCreateProjectClick = isDashboard ? props.onCreateProjectClick : undefined

  const [open, setOpen] = useState(false)
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState(false)
  const [trackerDialogOpen, setTrackerDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const isToolbar = variant === 'toolbar'
  const isModule = isModuleProps(props)
  const availableConfigTypes = isModule ? (props.availableConfigTypes ?? []) : []
  const hasConfigOptions = availableConfigTypes.length > 0
  const onAddConfig = isModule ? props.onAddConfig : undefined
  const addingConfig = isModule ? props.addingConfig : false

  useEffect(() => {
    if (!open) setConfigSubmenuOpen(false)
  }, [open])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setConfigSubmenuOpen(false)
  }, [])

  const handleProjectClick = useCallback(() => {
    setOpen(false)
    onCreateProjectClick?.()
  }, [onCreateProjectClick])

  const handleTrackerClick = useCallback(() => {
    setOpen(false)
    setTrackerDialogOpen(true)
  }, [])

  const handleReportClick = useCallback(() => {
    setOpen(false)
    setReportDialogOpen(true)
  }, [])

  const handleModuleClick = useCallback(() => {
    setOpen(false)
    setModuleDialogOpen(true)
  }, [])

  const handleConfigParentClick = useCallback(() => {
    if (hasConfigOptions) setConfigSubmenuOpen((prev) => !prev)
  }, [hasConfigOptions])

  const handleConfigClick = useCallback(
    (type: SystemFileType) => {
      setOpen(false)
      setConfigSubmenuOpen(false)
      onAddConfig?.(type)
    },
    [onAddConfig],
  )

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={isToolbar ? 'default' : 'secondary'}
            className={
              isToolbar
                ? 'h-7 gap-1.5 rounded-md text-xs font-medium'
                : 'rounded-full gap-1.5'
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Create
            <ChevronDown className="h-3 w-3 opacity-80" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-48 p-1 overflow-visible"
          sideOffset={4}
        >
          <div className="flex flex-col gap-0.5">
            {isDashboard && onCreateProjectClick && (
              <button
                type="button"
                onClick={handleProjectClick}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full"
              >
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                Project
              </button>
            )}
            <button
              type="button"
              onClick={handleTrackerClick}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full"
            >
              <FilePlus className="h-3.5 w-3.5 text-muted-foreground" />
              Tracker
            </button>
            {!isDashboard && projectId && (
              <button
                type="button"
                onClick={handleReportClick}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full"
              >
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                Report
              </button>
            )}
            {!isDashboard && (
              <button
                type="button"
                onClick={handleModuleClick}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full"
              >
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                Module
              </button>
            )}
            {hasConfigOptions && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleConfigParentClick}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Config
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-70" />
                </button>
                {configSubmenuOpen && (
                  <div
                    className="absolute left-0 top-full mt-0.5 min-w-[140px] py-1 rounded-md border bg-popover shadow-lg z-50"
                    role="menu"
                  >
                    {availableConfigTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleConfigClick(type)}
                        disabled={addingConfig}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-muted/60 transition-colors text-left w-full disabled:opacity-50"
                        role="menuitem"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {SYSTEM_FILE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <NewTrackerDialog
        projectId={projectId}
        moduleId={isModule ? props.moduleId : undefined}
        open={trackerDialogOpen}
        onOpenChange={setTrackerDialogOpen}
        onCreated={onTrackerCreated}
        onError={onError}
      />

      {!isDashboard && projectId && (
        <NewReportDialog
          projectId={projectId}
          moduleId={isModule ? props.moduleId : undefined}
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          onError={onError}
          onCreated={onReportCreated}
        />
      )}

      {!isDashboard && projectId && (
        <NewModuleButton
          projectId={projectId}
          parentId={isModule ? props.moduleId : undefined}
          open={moduleDialogOpen}
          onOpenChange={setModuleDialogOpen}
          onError={onError}
        />
      )}
    </>
  )
}
