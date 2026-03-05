'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
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
