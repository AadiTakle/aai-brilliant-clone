import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, db } from '../firebase/config'
import { AuthContext, type AuthContextValue } from './context'
import {
  logOut as logOutSvc,
  signIn as signInSvc,
  signInWithGoogle as signInWithGoogleSvc,
  signUpWithProfile,
} from './authService'
import { getUserProfile, type UserProfile } from '../lib/users'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next)
      setProfile(next ? await getUserProfile(db, next.uid) : null)
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      setProfile(await getUserProfile(db, auth.currentUser.uid))
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signUp: async (email, displayName, password) => {
        await signUpWithProfile(auth, db, { email, displayName, password })
      },
      signIn: async (email, password) => {
        await signInSvc(auth, email, password)
      },
      signInWithGoogle: async () => {
        await signInWithGoogleSvc(auth, db)
        // First-time Google users have their profile created inside the service;
        // refresh so the UI has it immediately (don't wait on the auth listener).
        await refreshProfile()
      },
      logOut: async () => {
        await logOutSvc(auth)
      },
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
