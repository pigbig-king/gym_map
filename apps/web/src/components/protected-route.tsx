import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/contexts/auth-context'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">加载中…</div>
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
