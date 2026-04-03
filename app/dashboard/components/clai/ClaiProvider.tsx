'use client'

import {
 createContext,
 useCallback,
 useContext,
 useMemo,
 useState,
 useEffect,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDashboard } from '../../dashboard-context'
import { ClaiWindow } from './ClaiWindow'
import { resolveDashboardPath } from './resolveDashboardPath'
import type { ClaiLine, ClaiInstance } from './types'

const STORAGE_KEY_POSITION = 'clai-window-position'
const STORAGE_KEY_SIZE = 'clai-window-size'
const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 420

const WELCOME_LINE: ClaiLine = {
 id: 'welcome',
 type: 'system',
 content: 'Welcome to CLAI. Type a command or ask a question.',
}

function createInstance(id: string, location: string): ClaiInstance {
 return {
 id,
 lines: [WELCOME_LINE],
 location,
 }
}

function loadStoredPosition(): { x: number; y: number } | null {
 if (typeof window === 'undefined') return null
 try {
 const raw = localStorage.getItem(STORAGE_KEY_POSITION)
 if (!raw) return null
 const parsed = JSON.parse(raw) as { x: number; y: number }
 if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
 } catch {
 // ignore
 }
 return null
}

function loadStoredSize(): { width: number; height: number } | null {
 if (typeof window === 'undefined') return null
 try {
 const raw = localStorage.getItem(STORAGE_KEY_SIZE)
 if (!raw) return null
 const parsed = JSON.parse(raw) as { width: number; height: number }
 if (
 typeof parsed.width === 'number' &&
 parsed.width >= 400 &&
 parsed.width <= 1200 &&
 typeof parsed.height === 'number' &&
 parsed.height >= 300 &&
 parsed.height <= 800
 ) {
 return parsed
 }
 } catch {
 // ignore
 }
 return null
}

function getDefaultPosition(): { x: number; y: number } {
 if (typeof window === 'undefined') return { x: 0, y: 0 }
 return {
 x: Math.max(0, (window.innerWidth - DEFAULT_WIDTH) / 2),
 y: Math.max(0, (window.innerHeight - DEFAULT_HEIGHT) / 2),
 }
}

interface ClaiContextValue {
 open: boolean
 setOpen: (open: boolean) => void
}

const ClaiContext = createContext<ClaiContextValue | null>(null)

export function useClai() {
 const ctx = useContext(ClaiContext)
 if (!ctx) throw new Error('useClai must be used within ClaiProvider')
 return ctx
}

export interface ClaiProviderProps {
 children: React.ReactNode
 /** Persist window position and size to localStorage. Default true. */
 persistPosition?: boolean
}

export function ClaiProvider({
 children,
 persistPosition = true,
}: ClaiProviderProps) {
 const pathname = usePathname()
 const { projects } = useDashboard()
 const location = useMemo(
 () => resolveDashboardPath(pathname ?? '', projects),
 [pathname, projects]
 )

 const [open, setOpen] = useState(false)
 const [instances, setInstances] = useState<ClaiInstance[]>(() => [
 createInstance(`clai-${Date.now()}`, location),
 ])
 const [activeId, setActiveId] = useState<string>(() => instances[0]?.id ?? '')
 const [position, setPosition] = useState<{ x: number; y: number }>(() =>
 loadStoredPosition() ?? getDefaultPosition()
 )
 const [size, setSize] = useState<{ width: number; height: number }>(() =>
 loadStoredSize() ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
 )
 const [mounted, setMounted] = useState(false)

 useEffect(() => {
 setMounted(true)
 }, [])

 // Keep active tab's location in sync with current pathname (live prompt)
 useEffect(() => {
 setInstances((prev) =>
 prev.map((inst) =>
 inst.id === activeId ? { ...inst, location } : inst
 )
 )
 }, [location, activeId])

 // Ensure activeId points to an existing instance
 useEffect(() => {
 const exists = instances.some((i) => i.id === activeId)
 if (!exists && instances.length > 0) {
 setActiveId(instances[0].id)
 }
 }, [instances, activeId])

 useEffect(() => {
 if (!persistPosition || typeof window === 'undefined') return
 localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position))
 }, [persistPosition, position])

 useEffect(() => {
 if (!persistPosition || typeof window === 'undefined') return
 localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size))
 }, [persistPosition, size])

 const handleSubmit = useCallback((instanceId: string, value: string) => {
 const commandLine: ClaiLine = {
 id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
 type: 'command',
 content: value,
 timestamp: Date.now(),
 }
 const replyLine: ClaiLine = {
 id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
 type: 'text',
 content: `You said: ${value}`,
 timestamp: Date.now(),
 }
 setInstances((prev) =>
 prev.map((inst) =>
 inst.id === instanceId
 ? {
 ...inst,
 lines: [...inst.lines, commandLine, replyLine],
 }
 : inst
 )
 )
 }, [])

 const handleAddTab = useCallback(() => {
 const newInstance = createInstance(`clai-${Date.now()}`, location)
 setInstances((prev) => [...prev, newInstance])
 setActiveId(newInstance.id)
 }, [location])

 const handleCloseTab = useCallback(
 (id: string) => {
 const remaining = instances.filter((i) => i.id !== id)
 const newInstances =
 remaining.length > 0
 ? remaining
 : [createInstance(`clai-${Date.now()}`, location)]
 if (id === activeId && remaining.length > 0) {
 const closedIndex = instances.findIndex((i) => i.id === id)
 const nextActive =
 remaining[closedIndex > 0 ? closedIndex - 1 : 0] ?? remaining[0]
 setActiveId(nextActive?.id ?? '')
 } else if (remaining.length === 0) {
 setActiveId(newInstances[0]?.id ?? '')
 }
 setInstances(newInstances)
 },
 [instances, activeId, location]
 )

 const handlePositionChange = useCallback((x: number, y: number) => {
 setPosition({ x, y })
 }, [])

 const handleSizeChange = useCallback((width: number, height: number) => {
 setSize({ width, height })
 }, [])

 const contextValue = useMemo<ClaiContextValue>(
 () => ({ open, setOpen }),
 [open]
 )

 const windowNode = open && mounted && (
 <ClaiWindow
 instances={instances}
 activeId={activeId}
 onActiveIdChange={setActiveId}
 onAddTab={handleAddTab}
 onCloseTab={handleCloseTab}
 onCloseWindow={() => setOpen(false)}
 onSubmit={handleSubmit}
 currentLocation={location}
 position={position}
 size={size}
 onPositionChange={handlePositionChange}
 onSizeChange={handleSizeChange}
 />
 )

 return (
 <ClaiContext.Provider value={contextValue}>
 {children}
 {mounted && windowNode && createPortal(windowNode, document.body)}
 {!open && (
 <Button
 type="button"
 variant="secondary"
 size="icon"
 className={cn(
 'fixed bottom-6 right-6 z-40 h-11 w-11 rounded-sm border border-border/60',
 'hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors'
 )}
 onClick={() => setOpen(true)}
 aria-label="Open CLAI"
 >
 <Terminal className="h-5 w-5" />
 </Button>
 )}
 </ClaiContext.Provider>
 )
}
