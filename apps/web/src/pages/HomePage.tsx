import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GymMap from '@/components/LazyGymMap'
import { apiFetch } from '@/lib/api'

type Gym = {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  lat: number
  lng: number
  price: string | null
  environment: string | null
  equipment: { name: string; quantity: number; status: string }[]
  _count: { checkIns: number; reviews: number }
}
type GymList = { total: number; items: Gym[] }

export default function HomePage() {
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [q, setQ] = useState('')
  const [listOpen, setListOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true))
  const [focus, setFocus] = useState<{ lng: number; lat: number; zoom?: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['gyms', city, district, q],
    queryFn: () => {
      const params = new URLSearchParams()
      if (city) params.set('city', city)
      if (district) params.set('district', district)
      if (q) params.set('q', q)
      params.set('pageSize', '100')
      return apiFetch<GymList>(`/gyms?${params.toString()}`)
    },
  })

  const gyms = query.data?.items ?? []

  const districts = useMemo(() => {
    const set = new Set<string>()
    for (const g of gyms) if (g.district) set.add(g.district)
    return [...set]
  }, [gyms])

  function locate() {
    if (!navigator.geolocation) {
      setLocateError('浏览器不支持定位')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFocus({ lng: pos.coords.longitude, lat: pos.coords.latitude, zoom: 14 })
        setLocating(false)
      },
      () => {
        setLocateError('定位失败，请检查浏览器权限')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <main className="relative h-[calc(100vh-56px)] w-full">
      {/* 满屏地图 */}
      <div className="absolute inset-0">
        {query.isSuccess && (
          <GymMap
            gyms={gyms.map((g) => ({
              id: g.id,
              name: g.name,
              lat: g.lat,
              lng: g.lng,
              district: g.district,
              price: g.price,
              environment: g.environment,
              equipment: g.equipment,
            }))}
            focus={focus}
            onSelect={(id, section) => navigate(`/gyms/${id}${section ? `#${section}` : ''}`)}
          />
        )}
      </div>

      {/* 加载态 */}
      {query.isLoading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            加载中…
          </div>
        </div>
      )}

      {/* 顶部搜索栏 */}
      <div className="glass absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-lg border p-2 shadow-md">
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="城市，如 合肥" className="w-28" />
        <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="区域" className="w-24" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索健身房名称" className="w-40" />
        <Button size="sm" variant="outline" onClick={() => setListOpen((v) => !v)}>
          {listOpen ? '收起列表' : '展开列表'}
        </Button>
        <Button size="sm" onClick={() => navigate('/gyms/new')}>
          + 提交健身房
        </Button>
      </div>

      {/* 分区快捷筛选 */}
      {districts.length > 0 && (
        <div className="glass absolute left-3 top-14 z-10 flex max-w-[calc(100%-24px)] flex-wrap gap-1 rounded-lg border p-1.5 shadow-md">
          {districts.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistrict(district === d ? '' : d)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                district === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* 左侧列表 */}
      {listOpen && (
        <div className="glass absolute bottom-3 left-3 top-24 z-10 flex w-72 flex-col overflow-hidden rounded-lg border shadow-md">
          <div className="border-b px-3 py-2 text-sm font-medium">健身房（{gyms.length}）</div>
          <ul className="flex-1 space-y-2 overflow-y-auto p-2">
            {gyms.map((g) => (
              <li key={g.id}>
                <div className="rounded-lg border p-2">
                  <button type="button" className="block w-full text-left" onClick={() => setFocus({ lng: g.lng, lat: g.lat, zoom: 15 })}>
                    <div className="truncate text-sm font-medium hover:text-primary">{g.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {g.city}
                      {g.district ? ` · ${g.district}` : ''}
                    </div>
                  </button>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="truncate text-xs text-muted-foreground">
                      {g.equipment.map((e) => e.name).slice(0, 3).join('、') || '暂无器械'}
                    </span>
                    <Link to={`/gyms/${g.id}`} className="shrink-0 text-xs text-primary hover:underline">
                      详情 →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
            {gyms.length === 0 && !query.isLoading && <p className="p-2 text-sm text-muted-foreground">暂无健身房，去提交一个吧</p>}
          </ul>
        </div>
      )}

      {/* 定位按钮 */}
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        aria-label="定位到我的位置"
        className="glass absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-md transition-transform hover:scale-105 disabled:opacity-60"
      >
        {locating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : '📍'}
      </button>

      {locateError && (
        <div className="glass absolute bottom-16 right-4 z-10 rounded-lg border px-3 py-2 text-xs text-destructive shadow-md">{locateError}</div>
      )}
    </main>
  )
}
