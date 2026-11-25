import { Map, Marker, Popup, setWorkerUrl, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'

setWorkerUrl(maplibreWorkerUrl)

export type GymMarker = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  district?: string | null
  price?: string | null
  environment?: string | null
  equipment: { name: string; quantity: number; status: string }[]
}

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: ['https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'],
      tileSize: 256,
      attribution: '© 高德地图',
    },
  },
  layers: [
    {
      id: 'base',
      type: 'raster',
      source: 'base',
      paint: {
        'raster-brightness-min': 0.2,
        'raster-brightness-max': 0.82,
        'raster-saturation': -0.68,
        'raster-contrast': 0.08,
        'raster-opacity': 1,
      },
    },
  ],
}

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 30 42" aria-hidden="true"><path fill-rule="evenodd" fill="#ef4444" stroke="#ffffff" stroke-width="1.8" d="M15 1C7.3 1 1 7.3 1 15c0 10.5 14 25 14 25s14-14.5 14-25C29 7.3 22.7 1 15 1z M15 10.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>`

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function initialView(gyms: GymMarker[], fallbackCenter: [number, number]): { center: [number, number]; zoom: number } {
  if (gyms.length === 0) return { center: fallbackCenter, zoom: 11 }
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const g of gyms) {
    minLng = Math.min(minLng, g.lng)
    maxLng = Math.max(maxLng, g.lng)
    minLat = Math.min(minLat, g.lat)
    maxLat = Math.max(maxLat, g.lat)
  }
  const span = Math.max(maxLng - minLng, maxLat - minLat)
  const zoom = gyms.length === 1 ? 14 : span > 1 ? 6 : span > 0.3 ? 9 : 12
  return { center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom }
}

function buildPopupHTML(gym: GymMarker): string {
  return `
  <article class="gym-popup-card">
    <header class="gym-popup-header">
      <button data-id="${escapeHtml(gym.id)}" class="gym-popup-title">${escapeHtml(gym.name)}</button>
      <div class="gym-popup-location">${escapeHtml(gym.address || gym.district || '')}</div>
    </header>
  </article>`
}

export default function GymMap({
  gyms,
  onSelect,
  clickToPick,
  onPick,
  focus,
  initialCenter = [117.23, 31.82],
}: {
  gyms?: GymMarker[]
  onSelect?: (id: string, section?: string) => void
  clickToPick?: boolean
  onPick?: (lng: number, lat: number) => void
  focus?: { lng: number; lat: number; zoom?: number } | null
  initialCenter?: [number, number]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const selectedGymIdRef = useRef<string | null>(null)
  const markersRef = useRef<Marker[]>([])
  const gymsRef = useRef<GymMarker[]>(gyms ?? [])
  const mapLoadedRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const showPopup = useCallback((gym: GymMarker) => {
    const map = mapRef.current
    if (!map) return
    popupRef.current?.remove()
    const popup = new Popup({ anchor: 'bottom', offset: 18, className: 'gym-popup', closeButton: false, maxWidth: '260px' })
      .setLngLat([gym.lng, gym.lat])
      .setHTML(buildPopupHTML(gym))
      .addTo(map)
    popupRef.current = popup
    popup.on('close', () => {
      if (popupRef.current === popup) popupRef.current = null
      selectedGymIdRef.current = null
    })
    popup.getElement()?.addEventListener('click', (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement).closest('[data-id]')
      if (!el) return
      const id = el.getAttribute('data-id')
      const section = el.getAttribute('data-section') || undefined
      if (id) onSelectRef.current?.(id, section)
    })
  }, [])

  const renderMarkers = useCallback(
    (list: GymMarker[]) => {
      const map = mapRef.current
      if (!map) return
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      for (const gym of list) {
        const el = document.createElement('div')
        el.className = 'gym-marker'
        el.innerHTML = `${PIN_SVG}<span class="gym-marker-label">${escapeHtml(gym.name)}</span>`
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          if (selectedGymIdRef.current === gym.id && popupRef.current) {
            popupRef.current.remove()
            popupRef.current = null
            selectedGymIdRef.current = null
            return
          }
          showPopup(gym)
          selectedGymIdRef.current = gym.id
          const mobilePadding = map.getCanvas().clientWidth < 640 ? { top: 160 } : undefined
          map.easeTo({ center: [gym.lng, gym.lat], duration: 450, padding: mobilePadding })
        })
        const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat([gym.lng, gym.lat]).addTo(map)
        markersRef.current.push(marker)
      }
    },
    [showPopup],
  )

  useEffect(() => {
    if (!containerRef.current) return
    let map: Map | null = null
    const markers = markersRef
    const popup = popupRef

    try {
      map = new Map({
        container: containerRef.current,
        style: BASE_STYLE,
        ...initialView(gymsRef.current, initialCenter),
        localIdeographFontFamily: 'sans-serif',
      })
      mapRef.current = map
      const m = map
      // Keep nearby clicks from unexpectedly zooming; wheel and touch gestures remain enabled.
      m.doubleClickZoom.disable()
      m.scrollZoom.enable()
      m.touchZoomRotate.enable()

      if (clickToPick && onPick) {
        m.on('click', (e: MapMouseEvent) => onPick(e.lngLat.lng, e.lngLat.lat))
      } else {
        m.on('load', () => {
          mapLoadedRef.current = true
          renderMarkers(gymsRef.current)
        })
      }
    } catch (err) {
      console.error('map init failed:', err)
      setFailed(true)
    }

    return () => {
      for (const marker of markers.current) marker.remove()
      markers.current = []
      popup.current?.remove()
      popup.current = null
      mapLoadedRef.current = false
      map?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    gymsRef.current = gyms ?? []
    if (mapLoadedRef.current) renderMarkers(gyms ?? [])
  }, [gyms, renderMarkers])

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom ?? 13 })
    }
  }, [focus])

  if (failed) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">地图加载失败，请刷新重试</div>
  }
  return <div ref={containerRef} className="h-full w-full" />
}
