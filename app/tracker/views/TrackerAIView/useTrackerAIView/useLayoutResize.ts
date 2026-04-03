'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MIN_LEFT_PX, MIN_RIGHT_PX } from '../types'

export function useLayoutResize(
 containerRef: React.RefObject<HTMLDivElement | null>,
 isChatOpen: boolean,
 isDesktop: boolean
) {
 const [leftWidth, setLeftWidth] = useState<number | null>(null)

 useEffect(() => {
 const container = containerRef.current
 if (!container || !isChatOpen || !isDesktop) return
 const clampWidth = () => {
 const rect = container.getBoundingClientRect()
 const fallback = Math.round(rect.width * 0.75)
 setLeftWidth((prev) => {
 const current = prev ?? fallback
 const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)
 return Math.max(MIN_LEFT_PX, Math.min(current, maxLeft))
 })
 }
 clampWidth()
 window.addEventListener('resize', clampWidth)
 return () => window.removeEventListener('resize', clampWidth)
 }, [containerRef, isChatOpen, isDesktop])

 const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
 event.preventDefault()
 const container = containerRef.current
 if (!container) return
 const rect = container.getBoundingClientRect()
 const maxLeft = Math.max(MIN_LEFT_PX, rect.width - MIN_RIGHT_PX)
 const handleMove = (moveEvent: PointerEvent) => {
 const next = moveEvent.clientX - rect.left
 const clamped = Math.max(MIN_LEFT_PX, Math.min(next, maxLeft))
 setLeftWidth(clamped)
 }
 const handleUp = () => {
 document.body.style.cursor = ''
 window.removeEventListener('pointermove', handleMove)
 window.removeEventListener('pointerup', handleUp)
 }
 document.body.style.cursor = 'col-resize'
 window.addEventListener('pointermove', handleMove)
 window.addEventListener('pointerup', handleUp)
 }, [containerRef])

 return { leftWidth, setLeftWidth, handlePointerDown }
}
