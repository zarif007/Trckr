'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  Loader2,
  X,
  FilePlus,
  FileText,
  ChevronRight,
  Users,
  Settings,
  ScrollText,
  Network,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { Module, ModuleFile, ProjectFileType } from '../../../dashboard-context'
import { PROJECT_FILE_LABELS, useDashboard } from '../../../dashboard-context'

const MODULE_FILE_ICONS: Record<ProjectFileType, typeof FileText> = {
  TEAMS: Users,
  SETTINGS: Settings,
  RULES: ScrollText,
  CONNECTIONS: Network,
}

const ALL_FILE_TYPES: ProjectFileType[] = ['TEAMS', 'SETTINGS', 'RULES', 'CONNECTIONS']

export default function DashboardModulePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const moduleId = params.moduleId as string

  const [mod, setMod] = useState<Module | null>(null)
  const [projectName, setProjectName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [addingConfig, setAddingConfig] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { fetchProjects } = useDashboard()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchModule = useCallback(async () => {
    if (!moduleId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/modules/${moduleId}`)
      if (res.status === 404) {
        router.replace(`/dashboard/${projectId}`)
        return
      }
      if (!res.ok) throw new Error('Failed to load module')
      const data = await res.json()
      setMod(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [moduleId, projectId, router])

  const fetchProjectName = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProjectName(data.name)
      }
    } catch {
      // ignore
    }
  }, [projectId])

  useEffect(() => {
    if (moduleId) fetchModule()
    if (projectId) fetchProjectName()
  }, [moduleId, projectId, fetchModule, fetchProjectName])

  const moduleFiles = mod?.moduleFiles ?? []
  const trackerSchemas = mod?.trackerSchemas ?? []
  const totalItems = moduleFiles.length + trackerSchemas.length
  const isEmpty = totalItems === 0

  const existingFileTypes = new Set(moduleFiles.map((f) => f.type))
  const availableFileTypes = ALL_FILE_TYPES.filter((t) => !existingFileTypes.has(t))

  const tableRows = useMemo(() => {
    if (!mod) return []
    const fileRows = moduleFiles.map((file: ModuleFile) => ({
      kind: 'file' as const,
      id: file.id,
      label: PROJECT_FILE_LABELS[file.type],
      sublabel: 'Override',
      icon: MODULE_FILE_ICONS[file.type],
      updatedAt: file.updatedAt,
      href: `/dashboard/${projectId}/module/${moduleId}/file/${file.id}`,
    }))
    const trackerRows = trackerSchemas.map((tracker) => ({
      kind: 'tracker' as const,
      id: tracker.id,
      label: tracker.name || 'Untitled tracker',
      sublabel: 'Tracker',
      icon: FileText,
      updatedAt: tracker.updatedAt,
      href: `/tracker/${tracker.id}`,
    }))
    return [...fileRows, ...trackerRows]
  }, [projectId, moduleId, mod, moduleFiles, trackerSchemas])

  const handleCreateTracker = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new: true, projectId, moduleId }),
      })
      if (!res.ok) throw new Error('Failed to create tracker')
      const data = (await res.json()) as { id: string }
      router.push(`/tracker/${data.id}?new=true`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error creating tracker')
    } finally {
      setCreating(false)
    }
  }

  const handleAddConfig = async (type: ProjectFileType) => {
    setAddingConfig(true)
    setError(null)
    try {
      const res = await fetch(`/api/modules/${moduleId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error('Failed to add config')
      await fetchModule()
      await fetchProjects()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error adding config')
    } finally {
      setAddingConfig(false)
    }
  }

  if (loading && !mod) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 flex items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (!mod) {
    return null
  }

  return (
    <>
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-10 flex-shrink-0 border-b border-border/50 flex items-center justify-between px-4 gap-3 bg-background/80">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Desktop
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <Link
              href={`/dashboard/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {projectName || 'Untitled folder'}
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="font-medium text-foreground">
              {mod.name || 'Untitled module'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {availableFileTypes.length > 0 && (
              <div className="relative group">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 rounded-md text-xs font-medium"
                  disabled={addingConfig}
                >
                  {addingConfig ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add Config
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px] hidden group-hover:block z-20">
                  {availableFileTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAddConfig(type)}
                      disabled={addingConfig}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted/60 transition-colors"
                    >
                      {PROJECT_FILE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 rounded-md text-xs font-medium"
              onClick={handleCreateTracker}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FilePlus className="h-3.5 w-3.5" />
              )}
              New Tracker
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="h-full min-h-0">
            {isEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center border border-dashed border-border/30">
                  <FileText className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-xs font-medium">This module is empty</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full gap-1.5"
                  onClick={handleCreateTracker}
                  disabled={creating}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New Tracker
                </Button>
              </div>
            ) : (
              <div
                className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))] max-w-2xl"
                aria-label="Module items"
              >
                {tableRows.map((row) => {
                  const Icon = row.icon
                  return (
                    <button
                      key={row.kind === 'file' ? `file-${row.id}` : `tracker-${row.id}`}
                      type="button"
                      onClick={() => router.push(row.href)}
                      className="group flex flex-col items-center gap-2.5 rounded-xl p-4 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-muted transition-colors">
                        <Icon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-center leading-tight truncate w-full">
                        {row.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="h-6 flex-shrink-0 border-t border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground bg-muted/20">
        <span>
          {totalItems} item
          {totalItems !== 1 ? 's' : ''}
        </span>
        <span className="tabular-nums">
          {currentTime.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 right-6 z-50 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-0.5 rounded hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </>
  )
}
