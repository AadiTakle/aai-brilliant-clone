import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirebaseError } from 'firebase/app'
import { SignInPage } from '../../src/auth/SignInPage'
import { makeAuthValue, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 1] Sign-in page: validation, submit, error mapping
describe('[Phase 1] SignInPage', () => {
  it('calls signIn with credentials on valid submit', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn(async () => {})
    renderWithAuth(<SignInPage />, { authValue: makeAuthValue({ signIn }) })

    await user.type(screen.getByLabelText(/email/i), 'parent@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('parent@example.com', 'password1'))
  })

  it('surfaces a friendly error for bad credentials', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn(async () => {
      throw new FirebaseError('auth/invalid-credential', 'bad')
    })
    renderWithAuth(<SignInPage />, { authValue: makeAuthValue({ signIn }) })

    await user.type(screen.getByLabelText(/email/i), 'parent@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument()
  })
})
