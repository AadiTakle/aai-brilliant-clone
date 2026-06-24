import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from '../../src/components/Nav'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 1] Nav account menu: display name + Logout when signed in
describe('[Phase 1] Nav account menu', () => {
  it('shows a Sign in link when logged out', () => {
    renderWithAuth(<Nav />, { authValue: makeAuthValue({ user: null }) })
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows the display name and reveals Logout on click', async () => {
    const user = userEvent.setup()
    const logOut = vi.fn(async () => {})
    renderWithAuth(<Nav />, {
      authValue: makeAuthValue({ user: makeUser('Ada'), logOut }),
    })

    const trigger = screen.getByRole('button', { name: 'Ada' })
    expect(trigger).toBeInTheDocument()

    await user.click(trigger)
    const logoutItem = screen.getByRole('menuitem', { name: /logout/i })
    await user.click(logoutItem)

    await waitFor(() => expect(logOut).toHaveBeenCalledTimes(1))
  })

  it('toggles dark mode from the account menu', async () => {
    const user = userEvent.setup()
    renderWithAuth(<Nav />, { authValue: makeAuthValue({ user: makeUser('Ada') }) })

    await user.click(screen.getByRole('button', { name: 'Ada' }))
    const toggle = screen.getByRole('menuitemcheckbox', { name: /dark mode/i })
    await user.click(toggle)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(screen.getByRole('menuitemcheckbox', { name: /light mode/i })).toBeInTheDocument()
  })
})
