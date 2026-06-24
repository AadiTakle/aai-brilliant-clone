export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'pyxel-theme'

/** Decide the initial theme: a stored choice wins, else the OS preference. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}
