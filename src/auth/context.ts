import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../lib/users'

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, displayName: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
