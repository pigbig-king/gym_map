import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch } from '@/lib/api'

type PendingGym = {
  id: string
  name: string
  city: string
  district: string | null
  address: string
  status: string
  submittedBy: { id: string; nickname: string | null } | null
  equipment: { name: string; quantity: number }[]
}

export default function GymManager() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const pendingQuery = useQuery({
    queryKey: ['gyms-pending'],
    queryFn: () => apiFetch<PendingGym[]>('/gyms/pending', { token }),
    enabled: Boolean(token),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['gyms-pending'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/gyms/${id}`, { method: 'PATCH', token, body: { status: 'APPROVED' } }),
    onSuccess: invalidate,
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/gyms/${id}`, { method: 'PATCH', token, body: { status: 'REJECTED' } }),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/gyms/${id}`, { method: 'DELETE', token }),
    onSuccess: invalidate,
  })

  const pending = pendingQuery.data ?? []

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link to="/" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← 返回地图
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">健身房审核（{pending.length}）</h1>
      <p className="mb-4 text-sm text-muted-foreground">通过后健身房会出现在地图上，驳回/通过都会通知提交者。</p>

      {pending.length === 0 && <p className="text-muted-foreground">暂无待审健身房</p>}
      <ul className="space-y-3">
        {pending.map((g) => (
          <li key={g.id} className="rounded-lg border p-4">
            <div className="font-medium">{g.name}</div>
            <div className="text-sm text-muted-foreground">
              {g.city}
              {g.district ? ` · ${g.district}` : ''} · {g.address}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              提交者：{g.submittedBy?.nickname ?? '未知'} · 器械：{g.equipment.map((e) => `${e.name}×${e.quantity}`).join('、') || '暂无'}
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => approveMutation.mutate(g.id)}>
                通过
              </Button>
              <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(g.id)}>
                驳回
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(g.id)}>
                删除
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
