import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch } from '@/lib/api'

type Notification = {
  id: string
  type: string
  targetType: string | null
  targetId: string | null
  read: boolean
  createdAt: string
  actor: { id: string; nickname: string | null } | null
}
type NotificationList = { unreadCount: number; items: Notification[] }

const TYPE_LABEL: Record<string, string> = {
  gym_approved: '你提交的健身房已通过审核',
  gym_rejected: '你提交的健身房已被驳回',
}

function targetLink(n: Notification): string | null {
  if (!n.targetType || !n.targetId) return null
  if (n.targetType === 'gym') return `/gyms/${n.targetId}`
  return null
}

export default function NotificationsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<NotificationList>('/notifications', { token }),
    enabled: Boolean(token),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAllRead = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">通知</h1>
        {query.data && query.data.unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()}>
            全部已读
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {query.data?.items.map((n) => {
          const link = targetLink(n)
          const body = (
            <>
              <span className="font-medium">{n.actor?.nickname ?? '系统'}</span>
              <span className="text-muted-foreground"> {TYPE_LABEL[n.type] ?? n.type}</span>
              {!n.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />}
            </>
          )
          return (
            <li
              key={n.id}
              className={`rounded-lg border p-3 text-sm ${n.read ? 'opacity-70' : 'bg-muted/40'}`}
            >
              {link ? (
                <Link to={link} className="no-underline" onClick={() => markRead.mutate(n.id)}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>

      {query.data && query.data.items.length === 0 && <p className="text-muted-foreground">暂无通知</p>}
    </main>
  )
}
