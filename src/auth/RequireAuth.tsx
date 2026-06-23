import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div role="status">Loading…</div>
  }
  if (!user) {
    return <Navigate to="/sign-in" replace />
  }
  return <>{children}</>
}
