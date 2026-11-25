import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/contexts/auth-context'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">加载中…</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-destructive">无权访问，仅限管理员</div>
  }
  return <>{children}</>
}
