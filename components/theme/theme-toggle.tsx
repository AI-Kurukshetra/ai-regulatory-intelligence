'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

type Theme = 'light' | 'dark'

type ThemeToggleProps = {
  className?: string
}

const STORAGE_KEY = 'aml-theme'

function resolveTheme() {
  if (typeof window === 'undefined') {
    return 'dark' as Theme
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem(STORAGE_KEY, theme)
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const nextTheme = resolveTheme()
    setTheme(nextTheme)
    applyTheme(nextTheme)
    setMounted(true)
  }, [])

  function onSelect(nextTheme: Theme) {
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl',
        className
      )}
      role="group"
      aria-label="Color theme"
    >
      {([
        ['light', 'Light'],
        ['dark', 'Night']
      ] as const).map(([option, label]) => {
        const isActive = mounted && theme === option

        return (
          <button
            key={option}
            aria-pressed={isActive}
            className={cn(
              'rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition md:px-4',
              isActive
                ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            onClick={() => onSelect(option)}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
