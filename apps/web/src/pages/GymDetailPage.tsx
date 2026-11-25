import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import GymMap from '@/components/LazyGymMap'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch } from '@/lib/api'

type User = { id: string; nickname: string | null; avatarUrl: string | null }
type EquipReview = { id: string; rating: number; comment: string | null; user: User }
type Equipment = { id: string; name: string; professionalName: string | null; serialLabel: string | null; quantity: number; status: string; reviews: EquipReview[] }
type Review = { id: string; rating: number; comment: string | null; createdAt: string; user: User }
type GymDetail = {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  lat: number
  lng: number
  description: string | null
  environment: string | null
  price: string | null
  hours: string | null
  phone: string | null
  images: string[]
  equipment: Equipment[]
  reviews: Review[]
  _count: { checkIns: number; reviews: number }
  avgRating: number | null
  myCheckIn: boolean | null
  myReview: { rating: number; comment: string | null } | null
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  NORMAL: { text: '正常', cls: 'bg-green-100 text-green-700' },
  DAMAGED: { text: '损坏', cls: 'bg-red-100 text-red-700' },
  MAINTENANCE: { text: '维修中', cls: 'bg-yellow-100 text-yellow-700' },
}

export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewFor, setReviewFor] = useState<string | null>(null)
  const [eqRating, setEqRating] = useState(5)
  const [eqComment, setEqComment] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [eqName, setEqName] = useState('')
  const [eqProfessionalName, setEqProfessionalName] = useState('')
  const [eqSerialLabel, setEqSerialLabel] = useState('')
  const [eqQuantity, setEqQuantity] = useState(1)
  const [eqStatus, setEqStatus] = useState('NORMAL')
  const [toast, setToast] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function notify(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  const query = useQuery({
    queryKey: ['gym', id],
    queryFn: () => apiFetch<GymDetail>(`/gyms/${id}`, { token }),
    enabled: Boolean(id),
  })

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash, query.isSuccess])

  const checkInMutation = useMutation({
    mutationFn: () => apiFetch(`/gyms/${id}/check-in`, { method: 'POST', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['gym', id] }),
  })
  const reviewMutation = useMutation({
    mutationFn: () => apiFetch(`/gyms/${id}/review`, { method: 'POST', token, body: { rating, comment: comment.trim() || undefined } }),
    onSuccess: () => {
      setComment('')
      notify('评价已提交')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })
  const eqReviewMutation = useMutation({
    mutationFn: (equipmentId: string) =>
      apiFetch(`/gyms/${id}/equipment/${equipmentId}/review`, { method: 'POST', token, body: { rating: eqRating, comment: eqComment.trim() || undefined } }),
    onSuccess: () => {
      setReviewFor(null)
      setEqComment('')
      notify('评价已提交')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })
  const addEquipmentMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/gyms/${id}/equipment`, {
        method: 'POST',
        token,
        body: {
          name: eqName.trim(),
          professionalName: eqProfessionalName.trim() || undefined,
          serialLabel: eqSerialLabel.trim() || undefined,
          quantity: eqQuantity,
          status: eqStatus,
        },
      }),
    onSuccess: () => {
      setEqName('')
      setEqProfessionalName('')
      setEqSerialLabel('')
      setEqQuantity(1)
      setEqStatus('NORMAL')
      setShowAddForm(false)
      notify('已添加器械')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })
  const updateEquipmentMutation = useMutation({
    mutationFn: (args: { equipmentId: string; status: string }) =>
      apiFetch(`/gyms/${id}/equipment/${args.equipmentId}`, { method: 'PATCH', token, body: { status: args.status } }),
    onSuccess: () => {
      notify('已更新状态')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })
  const removeEquipmentMutation = useMutation({
    mutationFn: (equipmentId: string) => apiFetch(`/gyms/${id}/equipment/${equipmentId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      notify('已删除器械')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })

  if (query.isLoading) return <p className="p-8 text-center text-muted-foreground">加载中…</p>
  if (query.isError || !query.data) return <p className="p-8 text-center text-destructive">健身房不存在</p>

  const gym = query.data

  return (
    <main className="mx-auto max-w-4xl p-4">
      <Link to="/" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ← 返回地图
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">{gym.name}</h1>
      <div className="mb-2 text-sm text-muted-foreground">
        {gym.city}
        {gym.district ? ` · ${gym.district}` : ''} · {gym.address}
      </div>

      <div className="mb-4 h-56 overflow-hidden rounded-lg border">
        <GymMap gyms={[{ id: gym.id, name: gym.name, lat: gym.lat, lng: gym.lng, district: gym.district, price: gym.price, environment: gym.environment, equipment: gym.equipment }]} />
      </div>

      <section id="price" className="mb-4">
        <h2 className="mb-2 font-medium">价格</h2>
        <p className="text-muted-foreground">{gym.price || '暂无'}</p>
      </section>

      <section id="environment" className="mb-4">
        <h2 className="mb-2 font-medium">环境</h2>
        <p className="text-muted-foreground">{gym.environment || '暂无'}</p>
      </section>

      <section id="equipment" className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">器械清单</h2>
          {token && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? '收起' : '+ 新增器械'}
            </Button>
          )}
        </div>

        {showAddForm && token && (
          <div className="mb-3 rounded-lg border p-3">
            <div className="flex flex-wrap gap-2">
              <input value={eqName} onChange={(e) => setEqName(e.target.value)} placeholder="器械名称，如 深蹲架" className="h-9 min-w-32 flex-1 rounded-md border border-input bg-transparent px-2 text-sm" />
              <input value={eqProfessionalName} onChange={(e) => setEqProfessionalName(e.target.value)} placeholder="专业名称（可选）" className="h-9 min-w-32 flex-1 rounded-md border border-input bg-transparent px-2 text-sm" />
              <input value={eqSerialLabel} onChange={(e) => setEqSerialLabel(e.target.value)} placeholder="序号标签（可选）" className="h-9 min-w-32 flex-1 rounded-md border border-input bg-transparent px-2 text-sm" />
              <input type="number" min="1" step="1" value={eqQuantity} onChange={(e) => setEqQuantity(Math.max(1, Number(e.target.value)))} className="h-9 w-20 rounded-md border border-input bg-transparent px-2 text-sm" />
              <select value={eqStatus} onChange={(e) => setEqStatus(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
                <option value="NORMAL">正常</option>
                <option value="DAMAGED">损坏</option>
                <option value="MAINTENANCE">维修中</option>
              </select>
              <Button size="sm" disabled={!eqName.trim() || addEquipmentMutation.isPending} onClick={() => addEquipmentMutation.mutate()}>
                添加
              </Button>
            </div>
          </div>
        )}

        {gym.equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无器械信息</p>
        ) : (
          <ul className="space-y-2">
            {gym.equipment.map((e) => {
              const st = STATUS_LABEL[e.status] ?? STATUS_LABEL.NORMAL
              return (
                <li key={e.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.name}</span>
                    {e.professionalName && <span className="text-xs text-muted-foreground">（{e.professionalName}）</span>}
                    {e.serialLabel && <span className="text-xs text-muted-foreground">标签：{e.serialLabel}</span>}
                    <span className="text-sm">× {e.quantity}</span>
                    {token ? (
                      <select value={e.status} onChange={(ev) => updateEquipmentMutation.mutate({ equipmentId: e.id, status: ev.target.value })} className="h-7 rounded-md border border-input bg-transparent px-1 text-xs">
                        <option value="NORMAL">正常</option>
                        <option value="DAMAGED">损坏</option>
                        <option value="MAINTENANCE">维修中</option>
                      </select>
                    ) : (
                      <span className={`rounded px-2 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
                    )}
                    <button type="button" className="ml-auto text-xs text-primary hover:underline" onClick={() => setReviewFor(reviewFor === e.id ? null : e.id)}>
                      {e.reviews.length > 0 ? `评价(${e.reviews.length})` : '评价'}
                    </button>
                    {token && (
                      confirmId === e.id ? (
                        <button type="button" className="text-xs font-medium text-destructive hover:underline" onClick={() => { removeEquipmentMutation.mutate(e.id); setConfirmId(null) }}>
                          确认删除？
                        </button>
                      ) : (
                        <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setConfirmId(e.id)}>
                          删除
                        </button>
                      )
                    )}
                  </div>

                  {reviewFor === e.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select value={eqRating} onChange={(ev) => setEqRating(Number(ev.target.value))} className="h-8 rounded-md border border-input bg-transparent px-2 text-sm">
                        {[5, 4, 3, 2, 1].map((r) => (
                          <option key={r} value={r}>{r} 星</option>
                        ))}
                      </select>
                      <input value={eqComment} onChange={(ev) => setEqComment(ev.target.value)} placeholder="器材评价（可选）" className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm" />
                      <Button size="sm" disabled={!token} onClick={() => eqReviewMutation.mutate(e.id)}>提交</Button>
                    </div>
                  )}

                  {e.reviews.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {e.reviews.map((r) => (
                        <li key={r.id} className="text-muted-foreground">
                          {r.user.nickname ?? '匿名'} ★{r.rating}
                          {r.comment ? `：${r.comment}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {gym.description && <p className="mb-4 whitespace-pre-wrap text-muted-foreground">{gym.description}</p>}
      {gym.images.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {gym.images.map((url) => (
            <img key={url} src={url} alt="" className="h-24 w-32 rounded object-cover" />
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant={gym.myCheckIn ? 'secondary' : 'default'} onClick={() => (token ? checkInMutation.mutate() : undefined)} disabled={!token}>
          {gym.myCheckIn ? '已打卡（点击取消）' : '打卡'}
        </Button>
        {gym.avgRating != null && <span className="text-sm text-muted-foreground">评分 {gym.avgRating}（{gym._count.reviews} 条）· 打卡 {gym._count.checkIns}</span>}
      </div>

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-2 font-medium">健身房评分</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} 星</option>
            ))}
          </select>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="价格/环境/整体评价" className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm" />
          <Button size="sm" disabled={!token || reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>提交评价</Button>
        </div>
      </div>

      <h2 className="mb-2 font-medium">评价列表</h2>
      {gym.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无评价</p>
      ) : (
        <ul className="space-y-2">
          {gym.reviews.map((r) => (
            <li key={r.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.user.nickname ?? '匿名'}</span>
                <span className="text-muted-foreground">★ {r.rating}</span>
              </div>
              {r.comment && <div className="mt-1 whitespace-pre-wrap">{r.comment}</div>}
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
