import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { User } from 'firebase/auth'
import { AuthContext, type AuthContextValue } from '../../src/auth/context'
import { ThemeProvider } from '../../src/theme/ThemeProvider'

export function makeUser(displayName: string | null, uid = 'test-uid'): User {
  return { uid, displayName, email: 'parent@example.com' } as unknown as User
}

export function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    profile: null,
    loading: false,
    signUp: vi.fn(async () => {}),
    signIn: vi.fn(async () => {}),
    logOut: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => {}),
    ...overrides,
  }
}

export function renderWithAuth(
  ui: ReactElement,
  options: { authValue?: AuthContextValue; initialEntries?: string[] } = {},
) {
  const value = options.authValue ?? makeAuthValue()
  const wrapper = (children: ReactNode) => (
    <ThemeProvider>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>{children}</MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  )
  return { value, ...render(wrapper(ui)) }
}
