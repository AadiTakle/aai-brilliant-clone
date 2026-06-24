import { useEffect, useState } from 'react'
import type { Theme } from './theme'

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/**
 * Reads the active theme straight from `document.documentElement` and updates
 * when it changes. Independent of `ThemeProvider`, so components like the code
 * editor can react to dark mode without requiring the context in every test.
 */
export function useResolvedTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setTheme(currentTheme()))
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return theme
}
