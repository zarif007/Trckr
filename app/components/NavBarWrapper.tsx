'use client'

import { usePathname } from 'next/navigation'
import NavBar from './NavBar'

/**
 * Renders the general site NavBar only on routes that don't have their own navbar
 * (e.g. /tracker uses TrackerNavBar from its layout).
 */
export default function NavBarWrapper() {
  const pathname = usePathname()
  const isTrackerPage = pathname?.startsWith('/tracker') ?? false

  if (isTrackerPage) {
    return null
  }

  return <NavBar />
}
