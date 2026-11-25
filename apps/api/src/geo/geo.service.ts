import { Injectable } from '@nestjs/common'
import { CITY_COORDS } from './cities.data'

type GeoEntry = { name: string; city: string; district?: string; lat: number; lng: number }

// 合肥区县（比地级市更精细，用于更精确跳转）
const DISTRICTS: GeoEntry[] = [
  { name: '蜀山区', city: '合肥', district: '蜀山区', lat: 31.85, lng: 117.17 },
  { name: '庐阳区', city: '合肥', district: '庐阳区', lat: 31.87, lng: 117.27 },
  { name: '包河区', city: '合肥', district: '包河区', lat: 31.8, lng: 117.3 },
  { name: '瑶海区', city: '合肥', district: '瑶海区', lat: 31.86, lng: 117.32 },
  { name: '政务区', city: '合肥', district: '政务区', lat: 31.82, lng: 117.23 },
]

@Injectable()
export class GeoService {
  search(q: string) {
    const query = (q ?? '').trim()
    if (!query) return []

    const results: GeoEntry[] = []

    // 地级市：名称包含查询词（命中最多）
    for (const [name, c] of Object.entries(CITY_COORDS)) {
      if (name.includes(query)) {
        results.push({ name, city: name, lat: c.lat, lng: c.lng })
      }
    }

    // 区县：更精细匹配，排在前面
    const districtMatches: GeoEntry[] = []
    for (const d of DISTRICTS) {
      if (d.name.includes(query) || query.includes(d.name)) {
        districtMatches.push(d)
      }
    }

    // 区县优先，然后城市
    return [...districtMatches, ...results].slice(0, 12)
  }
}
