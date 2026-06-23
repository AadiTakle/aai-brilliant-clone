import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirebaseError } from 'firebase/app'
import { SignUpPage } from '../../src/auth/SignUpPage'
import { makeAuthValue, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 1] Sign-up page: validation, submit, auto-redirect, error mapping
describe('[Phase 1] SignUpPage', () => {
  it('shows validation errors and does not call signUp when invalid', async () => {
    const user = userEvent.setup()
    const signUp = vi.fn(async () => {})
    renderWithAuth(<SignUpPage />, { authValue: makeAuthValue({ signUp }) })

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('calls signUp with trimmed values on valid submit', async () => {
    const user = userEvent.setup()
    const signUp = vi.fn(async () => {})
    renderWithAuth(<SignUpPage />, { authValue: makeAuthValue({ signUp }) })

    await user.type(screen.getByLabelText(/parent\/guardian email/i), 'parent@example.com')
    await user.type(screen.getByLabelText(/display name/i), 'Ada')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith('parent@example.com', 'Ada', 'password1'),
    )
  })

  it('shows a friendly error when signUp rejects (duplicate email)', async () => {
    const user = userEvent.setup()
    const signUp = vi.fn(async () => {
      throw new FirebaseError('auth/email-already-in-use', 'dup')
    })
    renderWithAuth(<SignUpPage />, { authValue: makeAuthValue({ signUp }) })

    await user.type(screen.getByLabelText(/parent\/guardian email/i), 'parent@example.com')
    await user.type(screen.getByLabelText(/display name/i), 'Ada')
    await user.type(screen.getByLabelText(/^password$/i), 'password1')
    await user.type(screen.getByLabelText(/confirm password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/already in use/i)).toBeInTheDocument()
  })
})
