import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

// Mock the Firebase popup flow and the Firestore profile helpers so we can test
// the "create the profile only for first-time Google users" logic in isolation
// (the real popup cannot run in Node/jsdom).
const signInWithPopup = vi.fn()
vi.mock('firebase/auth', () => ({
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  GoogleAuthProvider: class {},
  // Unused by signInWithGoogle but imported by the module under test:
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}))

const getUserProfile = vi.fn()
const createUserProfile = vi.fn(async () => {})
vi.mock('../../src/lib/users', () => ({
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
  createUserProfile: (...args: unknown[]) => createUserProfile(...args),
}))

import { signInWithGoogle } from '../../src/auth/authService'

const auth = {} as Auth
const db = {} as Firestore

function mockPopupUser(user: { uid: string; displayName: string | null; email: string | null }) {
  signInWithPopup.mockResolvedValueOnce({ user })
}

describe('[Phase 1] signInWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a users/{uid} profile for a first-time Google user', async () => {
    mockPopupUser({ uid: 'g1', displayName: 'Ada Lovelace', email: 'ada@gmail.com' })
    getUserProfile.mockResolvedValueOnce(null)

    const user = await signInWithGoogle(auth, db)

    expect(user.uid).toBe('g1')
    expect(createUserProfile).toHaveBeenCalledWith(db, 'g1', {
      displayName: 'Ada Lovelace',
      email: 'ada@gmail.com',
    })
  })

  it('does NOT rewrite the profile for a returning Google user (keeps their stats)', async () => {
    mockPopupUser({ uid: 'g2', displayName: 'Grace', email: 'grace@gmail.com' })
    getUserProfile.mockResolvedValueOnce({ displayName: 'Grace', email: 'grace@gmail.com', totalPoints: 120 })

    await signInWithGoogle(auth, db)

    expect(createUserProfile).not.toHaveBeenCalled()
  })

  it('falls back to the email local-part when Google has no display name', async () => {
    mockPopupUser({ uid: 'g3', displayName: null, email: 'katherine@gmail.com' })
    getUserProfile.mockResolvedValueOnce(null)

    await signInWithGoogle(auth, db)

    expect(createUserProfile).toHaveBeenCalledWith(db, 'g3', {
      displayName: 'katherine',
      email: 'katherine@gmail.com',
    })
  })
})
