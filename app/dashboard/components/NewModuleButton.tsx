'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FolderPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboard } from '../dashboard-context'
import { dashboardQueryKeys } from '../query-keys'
import { useQueryClient } from '@tanstack/react-query'

export type NewModuleButtonVariant = 'toolbar' | 'empty'

export function NewModuleButton({
  projectId,
  parentId,
  variant = 'toolbar',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onError,
}: {
  projectId: string
  parentId?: string
  variant?: NewModuleButtonVariant
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onError?: (message: string) => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { fetchProjects } = useDashboard()

  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.project(projectId) })
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.projects() })
    if (parentId) {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.module(parentId) })
    }
  }, [queryClient, projectId, parentId])

  const handleCreate = useCallback(
    async (nameOverride?: string) => {
      const finalName = (nameOverride ?? name).trim() || 'New Module'
      setCreating(true)
      onError?.('')
      try {
        const res = await fetch(`/api/projects/${projectId}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            ...(parentId ? { parentId } : {}),
          }),
        })
        if (!res.ok) throw new Error('Failed to create module')
        const mod = (await res.json()) as { id: string }
        invalidate()
        await fetchProjects()
        setOpen(false)
        router.push(`/project/${projectId}/module/${mod.id}`)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error creating module'
        onError?.(message)
      } finally {
        setCreating(false)
      }
    },
    [projectId, parentId, name, invalidate, fetchProjects, router, onError],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreate(e.currentTarget.value)
      }
    },
    [handleCreate],
  )

  const isToolbar = variant === 'toolbar'

  return (
    <>
      {!isControlled && (
        <Button
          size="sm"
          variant={isToolbar ? 'ghost' : 'secondary'}
          className={isToolbar ? 'h-7 gap-1.5 rounded-md text-xs font-medium' : 'rounded-full gap-1.5'}
          onClick={() => setOpen(true)}
          disabled={creating}
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FolderPlus className="h-3.5 w-3.5" />
          )}
          New Module
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={true}
          className="sm:max-w-[380px] rounded-xl border-border/60 bg-background/95 shadow-xl backdrop-blur-sm p-0 gap-0 overflow-hidden"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-4 pt-6 pl-6 pr-12 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/10">
                <FolderPlus className="h-5 w-5" />
              </div>
              <DialogHeader className="p-0 gap-1 text-left min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  New module
                </DialogTitle>
                <DialogDescription className="text-[13px] text-muted-foreground/90">
                  Give your module a name. You can rename it anytime.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <label
                htmlFor="create-module-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Module name
              </label>
              <Input
                id="create-module-name"
                ref={inputRef}
                placeholder="e.g. Product team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-10 rounded-lg border-border/80 bg-muted/30 focus:bg-background transition-colors placeholder:text-muted-foreground/60"
              />
            </div>
            <DialogFooter className="flex-row gap-2 justify-end px-6 py-4 bg-muted/20 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-lg min-w-[72px]"
                onClick={() => handleCreate()}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
