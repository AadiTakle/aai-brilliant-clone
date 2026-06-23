import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { createUserProfile } from '../lib/users'

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

export function logOut(auth: Auth): Promise<void> {
  return signOut(auth)
}
