export const MIN_PASSWORD_LENGTH = 8

export interface SignUpInput {
  email: string
  displayName: string
  password: string
  confirmPassword: string
}

export interface SignUpErrors {
  email?: string
  displayName?: string
  password?: string
  confirmPassword?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/**
 * Pure validation for the sign-up form. Mirrors the PRD account model:
 * parent/guardian email, display name, password >= 8 chars, confirm match.
 */
export function validateSignUp(input: SignUpInput): SignUpErrors {
  const errors: SignUpErrors = {}

  if (!input.email.trim()) {
    errors.email = 'Enter a parent/guardian email.'
  } else if (!isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!input.displayName.trim()) {
    errors.displayName = 'Choose a display name.'
  }

  if (!input.password) {
    errors.password = 'Enter a password.'
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function hasErrors(errors: SignUpErrors): boolean {
  return Object.keys(errors).length > 0
}

export interface SignInErrors {
  email?: string
  password?: string
}

export function validateSignIn(email: string, password: string): SignInErrors {
  const errors: SignInErrors = {}
  if (!email.trim()) {
    errors.email = 'Enter your email.'
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password) {
    errors.password = 'Enter your password.'
  }
  return errors
}

/** Maps Firebase Auth error codes to kid-friendly messages. */
export function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already in use. Try signing in instead.'
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/weak-password':
      return 'That password is too weak. Use at least 8 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Try a different way to sign in.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups and try again.'
    case 'auth/unauthorized-domain':
      return 'This site is not allowed to sign in with Google yet. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
