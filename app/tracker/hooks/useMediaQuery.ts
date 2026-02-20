'use client'

import { useEffect, useState } from 'react'

/**
 * Returns whether the given media query matches. Uses 768px (Tailwind md) by default for desktop.
 * On SSR, returns false (assume small) to avoid hydration mismatch; client updates on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const m = window.matchMedia(query)
    setMatches(m.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** True when viewport is at least 768px (md breakpoint). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
