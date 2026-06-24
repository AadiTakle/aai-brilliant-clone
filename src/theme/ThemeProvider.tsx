import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './context'
import { resolveInitialTheme, THEME_STORAGE_KEY, type Theme } from './theme'

function safeReadStored(): string | null {
  try {
    return window.localStorage?.getItem?.(THEME_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function safePrefersDark(): boolean {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  } catch {
    return false
  }
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return resolveInitialTheme(safeReadStored(), safePrefersDark())
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage?.setItem?.(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
