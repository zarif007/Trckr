import type { Project, Module } from '../../dashboard-context'
import { PROJECT_FILE_LABELS } from '../../dashboard-context'

function findModuleInTree(modules: Module[], moduleId: string): Module | null {
  for (const m of modules) {
    if (m.id === moduleId) return m
    const found = findModuleInTree(m.children ?? [], moduleId)
    if (found) return found
  }
  return null
}

/**
 * Resolves a dashboard pathname to a human-readable path using project/module/file names from the given projects list.
 * Use this when projects have been loaded (e.g. from useDashboard()) so the terminal can show names instead of IDs.
 */
export function resolveDashboardPath(pathname: string, projects: Project[]): string {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (segments.length === 0 || segments[0] !== 'dashboard') {
    return segments.join('/') || 'dashboard'
  }

  const parts: string[] = ['dashboard']

  if (segments.length === 1) {
    return '~'
  }

  const second = segments[1]
  if (second === 'projects') return 'dashboard/projects'
  if (second === 'recents') return 'dashboard/recents'

  // second is projectId
  const projectId = second
  const project = projects.find((p) => p.id === projectId)
  const projectName = project?.name?.trim() || projectId
  parts.push(projectName)

  if (segments.length === 2) {
    return parts.join('/')
  }

  const third = segments[2]
  const fourth = segments[3]

  if (third === 'module' && fourth) {
    const moduleId = fourth
    const mod = project ? findModuleInTree(project.modules ?? [], moduleId) : null
    const moduleName = mod?.name?.trim() || moduleId
    parts.push('module', moduleName)
    return parts.join('/')
  }

  if (third === 'file' && fourth) {
    const fileId = fourth
    const file = project?.projectFiles?.find((f) => f.id === fileId)
    const fileLabel = file ? PROJECT_FILE_LABELS[file.type] : fileId
    parts.push('file', fileLabel)
    return parts.join('/')
  }

  return parts.join('/')
}
