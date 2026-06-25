import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from './useAuth'
import { mapAuthError, validateSignIn, type SignInErrors } from './validation'

export function SignInPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<SignInErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const nextErrors = validateSignIn(email, password)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) emailRef.current?.focus()
      else if (nextErrors.password) passwordRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
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
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="username"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
        </label>
        {errors.email && <p role="alert" className="field-error">{errors.email}</p>}

        <label>
          Password
          <input
            ref={passwordRef}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
        </label>
        {errors.password && <p role="alert" className="field-error">{errors.password}</p>}

        {formError && <p role="alert" className="form-error">{formError}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p>
        New here? <Link to="/sign-up">Create an account</Link>
      </p>
    </main>
  )
}
