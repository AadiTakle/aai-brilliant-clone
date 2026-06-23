import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { HomePage } from '../../src/pages/HomePage'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 1] Home page login gate: blur + prompt when logged out
describe('[Phase 1] HomePage login gate', () => {
  it('shows the login gate and blurs lessons when logged out', () => {
    const { container } = renderWithAuth(<HomePage />, {
      authValue: makeAuthValue({ user: null }),
    })
    expect(screen.getByRole('region', { name: /login required/i })).toBeInTheDocument()
    expect(container.querySelector('.lessons-grid.is-blurred')).not.toBeNull()
    // No active start links while logged out.
    expect(screen.queryByRole('link', { name: /start lesson/i })).not.toBeInTheDocument()
  })

  it('shows startable lessons and no gate when logged in', () => {
    const { container } = renderWithAuth(<HomePage />, {
      authValue: makeAuthValue({ user: makeUser('Ada') }),
    })
    expect(screen.queryByRole('region', { name: /login required/i })).not.toBeInTheDocument()
    expect(container.querySelector('.lessons-grid.is-blurred')).toBeNull()
    expect(screen.getByRole('link', { name: /start lesson/i })).toBeInTheDocument()
  })
})
