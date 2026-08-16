import type { CoordinateType, RiskType, SourceType } from '../types'

/** 风速 → 中国台风等级（GB/T 19201-2006 大致阈值） */
export function typhoonCategoryByWind(wind: number): string {
  if (wind >= 51) return '超强台风'
  if (wind >= 41.5) return '强台风'
  if (wind >= 32.7) return '台风'
  if (wind >= 24.5) return '强热带风暴'
  if (wind >= 17.2) return '热带风暴'
  return '热带低压'
}

export function formatWind(wind: number): string {
  return `${wind} m/s`
}

export function formatPressure(pressure: number): string {
  return `${pressure} hPa`
}

export function formatRadiusKm(radius: number): string {
  return radius > 0 ? `${radius} km` : '—'
}

/** 按指定时区偏移（相对 UTC，小时）返回 "YYYY-MM-DD HH:mm"；无效时间返回 "无效时间" */
export function formatClock(iso: string, offsetHours = 0): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '无效时间'
  const shifted = new Date(d.getTime() + offsetHours * 3_600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  )
}

/** UTC 显示 */
export function formatTimeUtc(iso: string): string {
  return `${formatClock(iso, 0)} UTC`
}

/** 北京时间（UTC+8）显示 */
export function formatTimeBeijing(iso: string): string {
  return `${formatClock(iso, 8)}（北京时间）`
}

/** 北京时间日期 "YYYY-MM-DD" */
export function formatDateBeijing(iso: string): string {
  return formatClock(iso, 8).slice(0, 10)
}

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  lowland: '低洼城区',
  torrent: '山洪沟谷',
  coast: '沿海岸段',
  urban: '人口密集区',
}

export const RISK_LEVEL_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

const DIRECTION_NAMES = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const

/** 移动方向（度）→ 八方位中文名（0°=北，顺时针） */
export function formatDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return DIRECTION_NAMES[index]
}

export const COORDINATE_TYPE_LABELS: Record<CoordinateType, string> = {
  authoritative: '权威坐标',
  'geocoded-location': '地点名称地理编码（仅可视化）',
  'approximate-for-visualization': '近似坐标（仅可视化）',
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'historical-track': '历史路径',
  'operational-bulletin': '业务通报',
  satellite: '卫星',
  'ocean-observation': '海洋观测',
  'risk-data': '风险数据',
  terrain: '地形',
  population: '人口',
  'base-map': '底图',
  'derived-analysis': '衍生分析',
}
