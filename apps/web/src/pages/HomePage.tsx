import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
  const [city, setCity] = useState('合肥')
  const [district, setDistrict] = useState('')
  const [q, setQ] = useState('')
  const [listOpen, setListOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true))
  const [focus, setFocus] = useState<{ lng: number; lat: number; zoom?: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['gyms', city, district, q],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (city) params.set('city', city)
      if (district) params.set('district', district)
      if (q) params.set('q', q)
      params.set('pageSize', '100')
      const firstPage = await apiFetch<GymList>(`/gyms?${params.toString()}`)
      const pages = await Promise.all(
        Array.from({ length: Math.ceil(firstPage.total / 100) - 1 }, (_, index) => {
          params.set('page', String(index + 2))
          return apiFetch<GymList>(`/gyms?${params.toString()}`)
        }),
      )
      return { ...firstPage, items: [...firstPage.items, ...pages.flatMap((page) => page.items)] }
    },
  })

  const gyms = query.data?.items ?? []

  const districts = city.trim() === '合肥'
    ? ['蜀山区', '庐阳区', '瑶海区', '包河区', '政务区', '经开区', '高新区', '新站区', '肥东县', '肥西县', '长丰县', '庐江县', '巢湖市']
    : [...new Set(gyms.map((gym) => gym.district).filter((value): value is string => Boolean(value)))].sort()

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
    <main className="relative h-[calc(100dvh-56px)] min-h-[540px] w-full overflow-hidden bg-slate-100">
      {/* 满屏地图 */}
      <div className="absolute inset-0">
        {query.isSuccess && (
          <GymMap
            gyms={gyms.map((g) => ({
              id: g.id,
              name: g.name,
              address: g.address,
              lat: g.lat,
              lng: g.lng,
              district: g.district,
              price: g.price,
              environment: g.environment,
              equipment: g.equipment,
            }))}
            focus={focus}
            initialCenter={[117.23, 31.82]}
            onSelect={(id, section) => navigate(`/gyms/${id}${section ? `#${section}` : ''}`)}
          />
        )}
      </div>

      {/* 加载态 */}
      {query.isLoading && !query.data && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            加载中…
          </div>
        </div>
      )}

      {/* 顶部搜索栏 */}
      <div className="glass absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 p-3 shadow-lg sm:left-5 sm:right-auto sm:top-5 sm:max-w-[min(760px,calc(100%-40px))] sm:gap-3 sm:p-4">
        <div className="mr-1 min-w-36">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">CITY FITNESS GUIDE</div>
          <h1 className="text-lg font-bold tracking-tight">合肥健身地图</h1>
        </div>
        <label className="sr-only" htmlFor="gym-city">城市</label>
        <Input id="gym-city" value={city} onChange={(e) => { setCity(e.target.value); setDistrict('') }} placeholder="城市，如 合肥" className="h-10 w-[calc(50%-8px)] rounded-xl bg-white/80 sm:w-28" />
        <label className="sr-only" htmlFor="gym-district">区县</label>
        <select id="gym-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="h-10 w-[calc(50%-8px)] rounded-xl border border-input bg-white/80 px-3 text-sm sm:w-32">
          <option value="">全部区县</option>
          {districts.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label className="sr-only" htmlFor="gym-search">搜索健身房</label>
        <Input id="gym-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索健身房名称" className="h-10 w-full rounded-xl bg-white/80 sm:w-44" />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setListOpen((v) => !v)}>
            {listOpen ? '收起列表' : '展开列表'}
          </Button>
          <Button size="sm" className="rounded-xl" onClick={() => navigate('/gyms/new')}>
            + 添加健身房
          </Button>
          <span className="ml-auto text-xs text-muted-foreground sm:ml-0">{query.data?.total ?? 0} 家已收录</span>
        </div>
      </div>

      {/* 分区快捷筛选 */}
      {districts.length > 0 && (
        <div className="glass absolute left-3 right-3 top-[220px] z-10 flex max-w-[calc(100%-24px)] flex-nowrap gap-1 overflow-x-auto rounded-xl border border-white/70 p-1.5 shadow-md sm:left-5 sm:right-auto sm:top-[144px] sm:max-w-[min(650px,calc(100%-40px))] sm:flex-wrap sm:overflow-visible">
          {districts.slice(0, 8).map((d) => (
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
        <div className="glass absolute bottom-3 left-3 top-[232px] z-10 flex w-[min(340px,calc(100%-24px))] flex-col overflow-hidden rounded-2xl border border-white/70 shadow-lg sm:bottom-5 sm:left-5 sm:top-[220px] sm:w-80">
          <div className="border-b bg-white/35 px-4 py-3 text-sm font-semibold">{city || '城市'} · 健身房（{query.data?.total ?? 0}）</div>
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
            {gyms.length === 0 && !query.isLoading && <div className="m-2 rounded-xl bg-white/70 p-4"><p className="text-sm font-medium">这个区域还没有收录健身房</p><p className="mt-1 text-xs text-muted-foreground">添加一家你熟悉的健身房，帮助合肥的训练者找到合适的场馆。</p><Button size="sm" className="mt-3 rounded-lg" onClick={() => navigate('/gyms/new')}>添加第一家</Button></div>}
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
