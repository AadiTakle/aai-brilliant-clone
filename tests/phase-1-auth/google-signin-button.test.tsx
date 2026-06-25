import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { GoogleSignInButton } from '../../src/auth/GoogleSignInButton'
import { makeAuthValue, renderWithAuth } from '../helpers/renderWithAuth'

// Renders the button at /start and a stand-in home page at / so we can observe
// the post-success navigation.
function renderButton(authValue = makeAuthValue()) {
  return renderWithAuth(
    <Routes>
      <Route path="/start" element={<GoogleSignInButton />} />
      <Route path="/" element={<div>home page</div>} />
    </Routes>,
    { authValue, initialEntries: ['/start'] },
  )
}

// [Phase 1] Google sign-in button
describe('[Phase 1] GoogleSignInButton', () => {
  it('renders a Continue with Google button', () => {
    renderButton()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('calls signInWithGoogle and navigates home on success', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn(async () => {})
    renderButton(makeAuthValue({ signInWithGoogle }))

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('home page')).toBeInTheDocument()
  })

  it('shows a friendly error when the popup is blocked', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn(async () => {
      throw new FirebaseError('auth/popup-blocked', 'blocked')
    })
    renderButton(makeAuthValue({ signInWithGoogle }))

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(await screen.findByText(/popup/i)).toBeInTheDocument()
    // It stayed on the button page (did not navigate).
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
  })

  it('silently ignores a cancelled popup (no error shown)', async () => {
    const user = userEvent.setup()
    const signInWithGoogle = vi.fn(async () => {
      throw new FirebaseError('auth/popup-closed-by-user', 'cancelled')
    })
    renderButton(makeAuthValue({ signInWithGoogle }))

    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
  })
})
