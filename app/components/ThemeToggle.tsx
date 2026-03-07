'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={`size-9 shrink-0 rounded-full border-0 shadow-none ${className ?? ''}`}
    >
      <span aria-hidden className="text-lg">{isDark ? '🌙' : '☀️'}</span>
    </Button>
  )
}
