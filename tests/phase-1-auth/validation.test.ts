import { describe, it, expect } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  mapAuthError,
  validateSignIn,
  validateSignUp,
} from '../../src/auth/validation'

// [Phase 1] Sign-up form validation rules
describe('[Phase 1] validateSignUp', () => {
  const valid = {
    email: 'parent@example.com',
    displayName: 'Ada',
    password: 'password1',
    confirmPassword: 'password1',
  }

  it('passes a fully valid input with no errors', () => {
    expect(validateSignUp(valid)).toEqual({})
  })

  it('rejects an invalid email', () => {
    expect(validateSignUp({ ...valid, email: 'not-an-email' }).email).toBeTruthy()
  })

  it('requires a display name', () => {
    expect(validateSignUp({ ...valid, displayName: '  ' }).displayName).toBeTruthy()
  })

  it(`requires a password of at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(validateSignUp({ ...valid, password: 'short', confirmPassword: 'short' }).password).toBeTruthy()
    const exactly = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(validateSignUp({ ...valid, password: exactly, confirmPassword: exactly }).password).toBeUndefined()
  })

  it('requires confirm password to match', () => {
    expect(validateSignUp({ ...valid, confirmPassword: 'different' }).confirmPassword).toBeTruthy()
  })
})

// [Phase 1] Sign-in form validation rules
describe('[Phase 1] validateSignIn', () => {
  it('flags missing email and password', () => {
    const errors = validateSignIn('', '')
    expect(errors.email).toBeTruthy()
    expect(errors.password).toBeTruthy()
  })

  it('accepts a valid email + password', () => {
    expect(validateSignIn('parent@example.com', 'secret123')).toEqual({})
  })
})

// [Phase 1] Email format helper
describe('[Phase 1] isValidEmail', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
  })
  it('rejects malformed emails', () => {
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('foo')).toBe(false)
  })
})

// [Phase 1] Friendly auth error mapping (incl. duplicate email)
describe('[Phase 1] mapAuthError', () => {
  it('maps duplicate-email to a helpful message', () => {
    expect(mapAuthError('auth/email-already-in-use')).toMatch(/already in use/i)
  })
  it('maps bad credentials to a generic incorrect message', () => {
    expect(mapAuthError('auth/invalid-credential')).toMatch(/incorrect/i)
  })
  it('falls back for unknown codes', () => {
    expect(mapAuthError('auth/whatever')).toMatch(/something went wrong/i)
  })

  it('maps a blocked Google popup to a helpful message', () => {
    expect(mapAuthError('auth/popup-blocked')).toMatch(/popup/i)
  })

  it('maps account-exists-with-different-credential to a try-another-way message', () => {
    expect(mapAuthError('auth/account-exists-with-different-credential')).toMatch(
      /already exists/i,
    )
  })

  it('maps an unauthorized domain to a friendly message', () => {
    expect(mapAuthError('auth/unauthorized-domain')).toMatch(/not allowed|try again/i)
  })
})
