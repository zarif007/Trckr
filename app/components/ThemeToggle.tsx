'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && theme) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [mounted, theme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="rounded-full" disabled>
        <span aria-hidden>☀️</span>
        <span className="text-muted-foreground">Light</span>
      </Button>
    )
  }

  const isDark = theme === 'dark'
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="rounded-full"
    >
      <span aria-hidden>{isDark ? '🌙' : '☀️'}</span>
      <span className="text-muted-foreground">{isDark ? 'Dark' : 'Light'}</span>
    </Button>
  )
}
