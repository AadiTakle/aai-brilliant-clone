import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from './useAuth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { hasErrors, mapAuthError, validateSignUp, type SignUpErrors } from './validation'

export function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const nextErrors = validateSignUp({ email, displayName, password, confirmPassword })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      if (nextErrors.email) emailRef.current?.focus()
      else if (nextErrors.displayName) displayNameRef.current?.focus()
      else if (nextErrors.password) passwordRef.current?.focus()
      else if (nextErrors.confirmPassword) confirmPasswordRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      await signUp(email.trim(), displayName.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      setFormError(mapAuthError(code))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <h1>Create Your Account</h1>
      <p className="auth-subtitle">
        A parent or guardian email is required. We only store a display name for you.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Parent/guardian email
          <input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
        </label>
        {errors.email && <p role="alert" className="field-error">{errors.email}</p>}

        <label>
          Display name
          <input
            ref={displayNameRef}
            type="text"
            name="displayName"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={Boolean(errors.displayName)}
          />
        </label>
        {errors.displayName && (
          <p role="alert" className="field-error">{errors.displayName}</p>
        )}

        <label>
          Password
          <input
            ref={passwordRef}
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </label>
        {errors.password && <p role="alert" className="field-error">{errors.password}</p>}

        <label>
          Confirm password
          <input
            ref={confirmPasswordRef}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
        </label>
        {errors.confirmPassword && (
          <p role="alert" className="field-error">{errors.confirmPassword}</p>
        )}

        {formError && <p role="alert" className="form-error">{formError}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <div className="auth-divider" role="separator">
        <span>or</span>
      </div>
      <GoogleSignInButton />
      <p>
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </p>
    </main>
  )
}
