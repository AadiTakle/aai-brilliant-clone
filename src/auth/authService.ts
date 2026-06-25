import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { createUserProfile, getUserProfile } from '../lib/users'

export interface SignUpParams {
  email: string
  displayName: string
  password: string
}

/**
 * Creates an account (which also signs the user in), sets the display name,
 * and writes the users/{uid} profile document. Returns the signed-in user.
 */
export async function signUpWithProfile(
  auth: Auth,
  db: Firestore,
  { email, displayName, password }: SignUpParams,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await createUserProfile(db, cred.user.uid, { displayName, email })
  return cred.user
}

export function signIn(
  auth: Auth,
  email: string,
  password: string,
): Promise<unknown> {
  return signInWithEmailAndPassword(auth, email, password)
}

/**
 * Signs the user in with a Google popup. For a first-time Google user (no
 * users/{uid} profile yet) it creates the profile from the Google account's
 * display name + email. Returning users keep their existing profile untouched —
 * we check-before-create because createUserProfile would otherwise reset their
 * aggregate stats (totalPoints, currentStreak, ...) back to zero. Returns the
 * signed-in user.
 */
export async function signInWithGoogle(auth: Auth, db: Firestore): Promise<User> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider())
  const { uid, displayName, email } = cred.user
  const existing = await getUserProfile(db, uid)
  if (!existing) {
    await createUserProfile(db, uid, {
      displayName: displayName ?? email?.split('@')[0] ?? 'Learner',
      email: email ?? '',
    })
  }
  return cred.user
}

export function logOut(auth: Auth): Promise<void> {
  return signOut(auth)
}
