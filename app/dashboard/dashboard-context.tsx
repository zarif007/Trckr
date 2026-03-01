'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

export type TrackerSchema = {
  id: string
  name: string | null
  projectId: string
  instance: string
  createdAt: string
  updatedAt: string
}

export type Project = {
  id: string
  name: string | null
  userId: string
  createdAt: string
  updatedAt: string
  trackerSchemas: TrackerSchema[]
}

type DashboardContextValue = {
  projects: Project[]
  setProjects: (p: Project[] | ((prev: Project[]) => Project[])) => void
  projectsLoading: boolean
  fetchProjects: () => Promise<void>
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) return
      const data = await res.json()
      setProjects(data)
    } catch {
      // ignore
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const value = useMemo<DashboardContextValue>(
    () => ({
      projects,
      setProjects,
      projectsLoading,
      fetchProjects,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [projects, projectsLoading, fetchProjects, sidebarCollapsed]
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
