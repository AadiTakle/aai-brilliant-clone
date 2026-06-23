import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, db } from '../firebase/config'
import { AuthContext, type AuthContextValue } from './context'
import { logOut as logOutSvc, signIn as signInSvc, signUpWithProfile } from './authService'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
    return unsub
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signUp: async (email, displayName, password) => {
        await signUpWithProfile(auth, db, { email, displayName, password })
      },
      signIn: async (email, password) => {
        await signInSvc(auth, email, password)
      },
      logOut: async () => {
        await logOutSvc(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
