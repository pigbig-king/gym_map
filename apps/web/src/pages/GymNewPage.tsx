import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GymMap from '@/components/LazyGymMap'
import { useAuth } from '@/contexts/auth-context'
import { apiFetch, uploadImage } from '@/lib/api'

type EquipmentRow = { name: string; professionalName: string; serialLabel: string; quantity: number; status: string }
type GeoResult = { name: string; city: string; district?: string; lat: number; lng: number }

export default function GymNewPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', address: '', city: '', district: '', price: '', hours: '', phone: '', description: '', environment: '' })
  const [latLng, setLatLng] = useState<{ lng: number; lat: number } | null>(null)
  const [equipment, setEquipment] = useState<EquipmentRow[]>([{ name: '', professionalName: '', serialLabel: '', quantity: 1, status: 'NORMAL' }])
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())
  const [geoQ, setGeoQ] = useState('')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [focus, setFocus] = useState<{ lng: number; lat: number; zoom?: number } | null>(null)

  useEffect(() => {
    const q = geoQ.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      apiFetch<GeoResult[]>(`/geo/search?q=${encodeURIComponent(q)}`)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [geoQ])

  function setField(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
    if (fieldErrors.has(key)) {
      setFieldErrors((prev) => {
        const n = new Set(prev)
        n.delete(key)
        return n
      })
    }
  }

  function fieldCls(key: string) {
    return fieldErrors.has(key) ? 'border-destructive ring-1 ring-destructive/30' : ''
  }

  async function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !token) return
    try {
      const url = await uploadImage(file, token)
      setImages((prev) => [...prev, url])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleSubmit() {
    if (!latLng || !form.name.trim() || !form.address.trim() || !form.city.trim()) {
      const missing = new Set<string>()
      if (!form.name.trim()) missing.add('name')
      if (!form.address.trim()) missing.add('address')
      if (!form.city.trim()) missing.add('city')
      if (!latLng) missing.add('latLng')
      setFieldErrors(missing)
      setError('请填写必填项（名称 / 地址 / 城市），并在下方地图上点击选点')
      return
    }
    setFieldErrors(new Set())
    const equip = equipment.filter((e) => e.name.trim())
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch('/gyms', {
        method: 'POST',
        token,
        body: {
          ...form,
          lat: latLng.lat,
          lng: latLng.lng,
          images,
          equipment: equip.map((e) => ({ name: e.name.trim(), professionalName: e.professionalName.trim() || undefined, serialLabel: e.serialLabel.trim() || undefined, quantity: e.quantity, status: e.status })),
        },
      })
      setSuccess(true)
      window.setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="mb-3 text-2xl font-semibold">提交健身房</h1>
      <p className="mb-3 text-sm text-muted-foreground">在地图上点击选点，填写信息后提交（需管理员审核后公开）。</p>

      <div className="relative mb-2">
        <Input value={geoQ} onChange={(e) => setGeoQ(e.target.value)} placeholder="输入模糊地址搜索并跳转，如 合肥 / 蜀山区" />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background shadow-md">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setFocus({ lng: s.lng, lat: s.lat, zoom: 13 })
                    setField('city', s.city)
                    if (s.district) setField('district', s.district)
                    setGeoQ(s.name)
                    setSuggestions([])
                  }}
                >
                  {s.name}
                  {s.district ? `（${s.city}）` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4 h-64 overflow-hidden rounded-lg border">
        <GymMap
          clickToPick
          focus={focus}
          onPick={(lng, lat) => {
            setLatLng({ lng, lat })
            setFieldErrors((prev) => {
              const n = new Set(prev)
              n.delete('latLng')
              return n
            })
          }}
        />
      </div>
      <div className={`mb-3 text-sm ${fieldErrors.has('latLng') ? 'font-medium text-destructive' : ''}`}>
        已选坐标：
        {latLng ? ` ${latLng.lng.toFixed(5)}, ${latLng.lat.toFixed(5)}` : ' 未选点（点击地图选择）'}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="名称 *" className={fieldCls('name')} />
        <Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="地址 *" className={fieldCls('address')} />
        <Input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="城市 *" className={fieldCls('city')} />
        <Input value={form.district} onChange={(e) => setField('district', e.target.value)} placeholder="区域（可选）" />
        <Input value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="价格（可选）" />
        <Input value={form.hours} onChange={(e) => setField('hours', e.target.value)} placeholder="营业时间（可选）" />
        <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="电话（可选）" />
        <Input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="简介（可选）" />
        <Input value={form.environment} onChange={(e) => setField('environment', e.target.value)} placeholder="环境（可选），如 通风好、器械齐全" />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">器械（名称 + 数量）</span>
          <Button size="sm" variant="outline" onClick={() => setEquipment((p) => [...p, { name: '', professionalName: '', serialLabel: '', quantity: 1, status: 'NORMAL' }])}>
            + 添加器械
          </Button>
        </div>
        <div className="space-y-2">
          {equipment.map((row, i) => (
            <div key={i} className="space-y-1 rounded-lg border p-2">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={row.name}
                  onChange={(e) => setEquipment((p) => p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
                  placeholder="器械名称，如 深蹲架"
                  className="min-w-32 flex-1"
                />
                <Input
                  value={row.professionalName}
                  onChange={(e) => setEquipment((p) => p.map((r, j) => (j === i ? { ...r, professionalName: e.target.value } : r)))}
                  placeholder="专业名称（可选）"
                  className="min-w-32 flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={row.quantity}
                  onChange={(e) => setEquipment((p) => p.map((r, j) => (j === i ? { ...r, quantity: Math.max(1, Number(e.target.value)) } : r)))}
                  className="w-20"
                />
                <select
                  value={row.status}
                  onChange={(e) => setEquipment((p) => p.map((r, j) => (j === i ? { ...r, status: e.target.value } : r)))}
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="NORMAL">正常</option>
                  <option value="DAMAGED">损坏</option>
                  <option value="MAINTENANCE">维修中</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => setEquipment((p) => p.filter((_, j) => j !== i))}>
                  删
                </Button>
              </div>
              <Input
                value={row.serialLabel}
                onChange={(e) => setEquipment((p) => p.map((r, j) => (j === i ? { ...r, serialLabel: e.target.value } : r)))}
                placeholder="序号标签（可选），如 1~5号"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm">图片（可选，可多张）</label>
        <input type="file" accept="image/*" onChange={(e) => void handleImage(e)} />
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((url) => (
              <img key={url} src={url} alt="" className="h-16 w-16 rounded object-cover" />
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button className="mt-4" onClick={() => void handleSubmit()} disabled={submitting || success}>
        {submitting ? '提交中…' : success ? '已提交，等待审核 ✓' : '提交'}
      </Button>
    </main>
  )
}
