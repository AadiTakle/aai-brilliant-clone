import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../../src/auth/RequireAuth'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'

function Protected() {
  return <div>secret content</div>
}
function SignInStub() {
  return <div>sign in screen</div>
}

function Harness() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Protected />
          </RequireAuth>
        }
      />
      <Route path="/sign-in" element={<SignInStub />} />
    </Routes>
  )
}

// [Phase 1] Route guard: redirects unauthenticated users
describe('[Phase 1] RequireAuth', () => {
  it('redirects to /sign-in when there is no user', () => {
    renderWithAuth(<Harness />, { authValue: makeAuthValue({ user: null }) })
    expect(screen.getByText(/sign in screen/i)).toBeInTheDocument()
    expect(screen.queryByText(/secret content/i)).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderWithAuth(<Harness />, { authValue: makeAuthValue({ user: makeUser('Ada') }) })
    expect(screen.getByText(/secret content/i)).toBeInTheDocument()
  })

  it('shows a loading state while auth is resolving', () => {
    renderWithAuth(<Harness />, { authValue: makeAuthValue({ user: null, loading: true }) })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
