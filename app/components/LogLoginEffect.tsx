'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

/**
 * Calls POST /api/auth/log-login once per session when user is on tracker.
 * Records userAgent (and server sees IP) for "where/how" login tracking.
 */
export default function LogLoginEffect() {
  const { data: session, status } = useSession()
  const logged = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || logged.current) return
    logged.current = true
    fetch('/api/auth/log-login', { method: 'POST', credentials: 'include' }).catch(() => {})
  }, [session?.user?.id, status])

  return null
}
