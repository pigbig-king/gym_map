import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
  const { token, user } = useAuth()
  const canManageEquipment = user?.role === 'ADMIN'
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
    queryKey: ['gym', id, token],
    queryFn: () => apiFetch<GymDetail>(`/gyms/${id}`, { token }),
    enabled: Boolean(id),
  })

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash, query.isSuccess])

  const checkInMutation = useMutation({
    mutationFn: () => apiFetch(`/gyms/${id}/check-in`, { method: query.data?.myCheckIn ? 'DELETE' : 'POST', token }),
    onError: (error) => notify(error.message),
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
    onError: (error) => notify(error.message),
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
    onError: (error) => notify(error.message),
    mutationFn: (args: { equipmentId: string; status: string }) =>
      apiFetch(`/gyms/${id}/equipment/${args.equipmentId}`, { method: 'PATCH', token, body: { status: args.status } }),
    onSuccess: () => {
      notify('已更新状态')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })
  const removeEquipmentMutation = useMutation({
    onError: (error) => notify(error.message),
    mutationFn: (equipmentId: string) => apiFetch(`/gyms/${id}/equipment/${equipmentId}`, { method: 'DELETE', token }),
    onSuccess: () => {
      notify('已删除器械')
      void queryClient.invalidateQueries({ queryKey: ['gym', id] })
    },
  })

  const gym = query.data
  const mapGyms = useMemo(
    () =>
      gym
        ? [
            {
              id: gym.id,
              name: gym.name,
              address: gym.address,
              lat: gym.lat,
              lng: gym.lng,
              district: gym.district,
              price: gym.price,
              environment: gym.environment,
              equipment: gym.equipment,
            },
          ]
        : [],
    [gym],
  )

  const equipmentCount = gym?.equipment.reduce((total, item) => total + item.quantity, 0) ?? 0

  if (query.isLoading) return <p className="p-8 text-center text-muted-foreground">加载中…</p>
  if (query.isError || !gym) return <p className="p-8 text-center text-destructive">健身房不存在</p>

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50/70 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition hover:text-foreground">
          <span aria-hidden="true">←</span> 返回合肥地图
        </Link>

        <header className="relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-indigo-700">
                <span className="rounded-full bg-indigo-50 px-3 py-1">{gym.city}健身地图</span>
                {gym.district && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{gym.district}</span>}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{gym.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{gym.address}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-amber-600">★ {gym.avgRating?.toFixed(1) ?? '新场馆'}</span>
                <span className="text-slate-500">{gym._count.reviews} 条评价</span>
                <span className="text-slate-500">{gym._count.checkIns} 次打卡</span>
              </div>
            </div>
            <Button className="h-11 shrink-0 rounded-xl px-5" variant={gym.myCheckIn ? 'secondary' : 'default'} onClick={() => (token ? checkInMutation.mutate() : undefined)} disabled={!token || checkInMutation.isPending}>
              {gym.myCheckIn ? '今日已打卡' : token ? '记录今日打卡' : '登录后打卡'}
            </Button>
          </div>
        </header>

        <section aria-label="场馆信息摘要" className="my-4 grid grid-cols-2 gap-3 sm:my-5 sm:grid-cols-4">
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-medium text-slate-500">价格参考</p><p className="mt-2 text-lg font-semibold text-slate-900">{gym.price || '待补充'}</p></article>
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-medium text-slate-500">营业时间</p><p className="mt-2 truncate text-lg font-semibold text-slate-900">{gym.hours || '待补充'}</p></article>
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-medium text-slate-500">器械数量</p><p className="mt-2 text-lg font-semibold text-slate-900">{equipmentCount} <span className="text-sm font-normal text-slate-500">件 · {gym.equipment.length} 类</span></p></article>
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-medium text-slate-500">综合评分</p><p className="mt-2 text-lg font-semibold text-slate-900">{gym.avgRating?.toFixed(1) ?? '暂无'} <span className="text-amber-500">{gym.avgRating != null ? '★' : ''}</span></p></article>
        </section>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 sm:px-5"><div><h2 className="font-semibold text-slate-900">场馆位置</h2><p className="mt-0.5 text-xs text-slate-500">{gym.city}{gym.district ? ` · ${gym.district}` : ''}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">地图已定位</span></div>
            <div className="h-56 border-t sm:h-64"><GymMap gyms={mapGyms} initialCenter={[gym.lng, gym.lat]} focus={{ lng: gym.lng, lat: gym.lat, zoom: 14 }} /></div>
          </section>
          <section id="environment" className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">✦</span><div><h2 className="font-semibold text-slate-900">训练环境</h2><p className="text-xs text-slate-500">来自场馆资料</p></div></div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{gym.environment || gym.description || '环境信息尚未补充，欢迎熟悉这家场馆的用户提供资料。'}</p>
          </section>
        </div>

        <section id="price" className="mb-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-slate-900">价格与营业信息</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">价格参考</p><p className="mt-1 font-medium text-slate-900">{gym.price || '暂无公开价格'}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">营业时间</p><p className="mt-1 font-medium text-slate-900">{gym.hours || '暂无营业时间'}</p></div>
          </div>
        </section>

      <section id="equipment" className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-semibold text-slate-900">器械清单</h2><p className="mt-1 text-xs text-slate-500">共 {equipmentCount} 件器械，{gym.equipment.length} 个品类</p></div>
          {canManageEquipment && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? '收起' : '+ 新增器械'}
            </Button>
          )}
        </div>

        {showAddForm && canManageEquipment && (
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
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center"><p className="font-medium text-slate-800">器械清单还在完善中</p><p className="mt-1 text-sm text-slate-500">如果你去过这里，可以帮助补充真实器械信息。</p></div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {gym.equipment.map((e) => {
              const st = STATUS_LABEL[e.status] ?? STATUS_LABEL.NORMAL
              return (
                <li key={e.id} className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.name}</span>
                    {e.professionalName && <span className="text-xs text-muted-foreground">（{e.professionalName}）</span>}
                    {e.serialLabel && <span className="text-xs text-muted-foreground">标签：{e.serialLabel}</span>}
                    <span className="text-sm">× {e.quantity}</span>
                    {canManageEquipment ? (
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
                    {canManageEquipment && (
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

      {gym.description && <section className="my-5 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-2 font-semibold text-slate-900">场馆介绍</h2><p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{gym.description}</p></section>}
      {gym.images.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gym.images.map((url) => (
            <img key={url} src={url} alt={`${gym.name}场馆照片`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">为这家健身房评分</h2>
        <p className="mt-1 text-sm text-slate-500">分享真实体验，帮助大家找到适合自己的训练场地。</p>
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

      <h2 className="mb-3 font-semibold text-slate-900">用户评价 <span className="text-sm font-normal text-slate-500">({gym.reviews.length})</span></h2>
      {gym.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无评价</p>
      ) : (
        <ul className="space-y-2">
          {gym.reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
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
      </div>
    </main>
  )
}
