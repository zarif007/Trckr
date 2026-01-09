'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const t = localStorage.getItem('theme')
    if (t === 'light' || t === 'dark') return t
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme])

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm"
      style={{
        background: 'transparent',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <span aria-hidden>{theme === 'dark' ? '🌙' : '☀️'}</span>
      <span className="muted">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
