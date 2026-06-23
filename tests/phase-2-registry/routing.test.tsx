import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoutes } from '../../src/app/AppRoutes'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 2] Lesson/step routing
describe('[Phase 2] lesson routing', () => {
  it('renders the step at the given index', () => {
    renderWithAuth(<AppRoutes />, {
      authValue: makeAuthValue({ user: makeUser('Ada') }),
      initialEntries: ['/lessons/over-and-over-again/step/0'],
    })
    expect(document.querySelector('[data-step-type="article"]')).not.toBeNull()
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument()
  })

  it('navigates to the next step', async () => {
    const user = userEvent.setup()
    renderWithAuth(<AppRoutes />, {
      authValue: makeAuthValue({ user: makeUser('Ada') }),
      initialEntries: ['/lessons/over-and-over-again/step/0'],
    })
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(document.querySelector('[data-step-type="block_problem"]')).not.toBeNull()
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument()
  })

  it('shows a not-found message for an out-of-range index', () => {
    renderWithAuth(<AppRoutes />, {
      authValue: makeAuthValue({ user: makeUser('Ada') }),
      initialEntries: ['/lessons/over-and-over-again/step/99'],
    })
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be found/i)
  })

  it('redirects unauthenticated users away from a lesson', () => {
    renderWithAuth(<AppRoutes />, {
      authValue: makeAuthValue({ user: null }),
      initialEntries: ['/lessons/over-and-over-again/step/0'],
    })
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })
})
