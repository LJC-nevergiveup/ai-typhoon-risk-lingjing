import type {
  ActiveMapData,
  CaseManifest,
  CoordinateType,
  DemoFeatureCollection,
  EnvironmentData,
  EnvironmentManifest,
  LandfallPoint,
  RealTrackPoint,
  RiskData,
  RiskGrid,
  RiskLayerInfo,
  RiskZone,
  SatelliteFrame,
  SchematicData,
  Shelter,
  SourceInfo,
  SourceType,
  SstFrame,
  TyphoonCase,
  TyphoonEvent,
  TyphoonPoint,
  WindRingProps,
} from '../types'
import { circlePolygon } from '../utils/geo'
import { typhoonCategoryByWind } from '../utils/format'

/**
 * 数据加载层：UI 与地图组件不直接 fetch，
 * 全部通过 loadCase() 获取类型化结果。
 *
 * 关键约定：
 * - DEMO 数据位于 data/demo/（合成数据，文件名带 -demo）；
 * - REAL 数据位于 data/real/<案例id>/，以 manifest.json 描述状态；
 * - REAL 数据状态不是 available 时返回 unavailable，绝不静默回退到 DEMO；
 * - 任何解析/网络错误返回明确的 error 结果。
 */

const DATA_BASE = `${import.meta.env.BASE_URL}data/`

/** 数据相对路径（相对 public/data/）→ 可 fetch 的完整路径 */
export function dataUrl(path: string): string {
  return `${DATA_BASE}${path}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`数据加载失败：${path}（HTTP ${res.status}）`)
  }
  return res.json() as Promise<T>
}

/** 案例加载结果（判别联合，UI 必须按 status 区分处理） */
export type CaseLoadResult =
  | { status: 'ready'; data: ActiveMapData }
  | { status: 'unavailable'; reason: string; caseInfo: TyphoonCase; sources: SourceInfo[] }
  | { status: 'error'; message: string; caseInfo: TyphoonCase }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/* ---------- 通用构建工具 ---------- */

const RING_LABELS: Record<number, string> = {
  7: '七级风圈',
  10: '十级风圈',
  12: '十二级风圈',
}

/** 由轨迹点风圈半径运行时生成风圈多边形 */
export function buildWindRings(
  track: TyphoonPoint[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps> {
  const features: GeoJSON.Feature<GeoJSON.Polygon, WindRingProps>[] = []
  for (const p of track) {
    const radii: Array<[number, number]> = [
      [7, p.r7],
      [10, p.r10],
      [12, p.r12],
    ]
    for (const [level, radius] of radii) {
      if (radius <= 0) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [circlePolygon([p.lon, p.lat], radius)] },
        properties: { pointId: p.id, level, radius, label: RING_LABELS[level] },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function nonEmptyOrNull(
  fc: GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps>,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps> | null {
  return fc.features.length > 0 ? fc : null
}

function buildTrackPoints(
  track: TyphoonPoint[],
): GeoJSON.FeatureCollection<GeoJSON.Point, TyphoonPoint> {
  return {
    type: 'FeatureCollection',
    features: track.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: p,
    })),
  }
}

function buildTrackLine(track: TyphoonPoint[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: track.map((p) => [p.lon, p.lat]),
    },
    properties: { id: 'track-line' },
  }
}

/** 登陆点 → 地图要素集合（highlightedIds 用于时间轴临近高亮） */
export type LandfallFeatureProps = LandfallPoint & { highlighted: boolean }

export function buildLandfallFeatures(
  landfalls: LandfallPoint[],
  highlightedIds: string[] = [],
): GeoJSON.FeatureCollection<GeoJSON.Point, LandfallFeatureProps> {
  const highlighted = new Set(highlightedIds)
  return {
    type: 'FeatureCollection',
    features: landfalls.map((l) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.longitude, l.latitude] },
      properties: { ...l, highlighted: highlighted.has(l.id) },
    })),
  }
}

/** 登陆点 → 通用台风事件（时间轴标记与地图联动共用） */
function buildLandfallEvents(landfalls: LandfallPoint[]): TyphoonEvent[] {
  return [...landfalls]
    .sort((a, b) => a.sequence - b.sequence)
    .map((l) => ({
      id: `landfall-${l.id}`,
      timestamp: l.timestamp,
      type: 'landfall' as const,
      title: `第${l.sequence}次登陆：${l.locationName}`,
      description: [
        l.intensity,
        l.maxWindSpeed != null ? `${l.maxWindSpeed} m/s` : '风速数值待权威数据',
        l.centralPressure != null ? `${l.centralPressure} hPa` : '气压数值待权威数据',
      ].join(' · '),
      coordinates: [l.longitude, l.latitude] as [number, number],
      source: l.source,
      shortLabel: `登陆${l.sequence}`,
    }))
}

/* ---------- DEMO 案例 ---------- */

interface DemoTrackFileProps {
  id: string
  time: string
  wind: number
  pressure: number
  category: string
  r7: number
  r10: number
  r12: number
}

type DemoTrackFile = {
  demo: boolean
  description: string
  features: GeoJSON.Feature<GeoJSON.Point, DemoTrackFileProps>[]
}

async function loadDemoCase(tc: TyphoonCase): Promise<CaseLoadResult> {
  try {
    const [trackFile, riskZones, shelters] = await Promise.all([
      fetchJson<DemoTrackFile>(`${DATA_BASE}${tc.dataDir}/typhoon-track-demo.geojson`),
      fetchJson<DemoFeatureCollection<GeoJSON.Polygon, RiskZone>>(
        `${DATA_BASE}${tc.dataDir}/risk-zones-demo.geojson`,
      ),
      fetchJson<DemoFeatureCollection<GeoJSON.Point, Shelter>>(
        `${DATA_BASE}${tc.dataDir}/shelters-demo.geojson`,
      ),
    ])

    if (trackFile.demo !== true) {
      console.warn('[data] 演示轨迹文件未标记 demo:true，请检查数据来源')
    }

    const track: TyphoonPoint[] = trackFile.features
      .map((f) => {
        const [lon, lat] = f.geometry.coordinates
        return { lon, lat, ...f.properties }
      })
      .sort((a, b) => a.time.localeCompare(b.time))

    const data: ActiveMapData = {
      kind: 'demo',
      caseInfo: tc,
      track,
      trackPoints: buildTrackPoints(track),
      trackLine: buildTrackLine(track),
      windRings: nonEmptyOrNull(buildWindRings(track)),
      landfalls: [],
      riskZones,
      shelters,
      sources: [],
      warnings: [],
      events: [],
      environment: null,
      risk: null,
      schematic: null,
    }
    return { status: 'ready', data }
  } catch (error) {
    return { status: 'error', message: errorMessage(error), caseInfo: tc }
  }
}

/* ---------- REAL 案例 ---------- */

interface StatusedFile {
  status?: string
}

type RealTrackFile = StatusedFile & {
  features: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>[]
}

type RealLandfallFile = StatusedFile & {
  features: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>[]
}

type RealWindRadiiFile = StatusedFile & {
  features: GeoJSON.Feature<GeoJSON.Polygon, Record<string, unknown>>[]
}

interface SourcesFile {
  sources: SourceInfo[]
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`字段 ${label} 缺失或不是非空字符串`)
  }
  return value.trim()
}

function asNumber(value: unknown, label: string): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`字段 ${label} 不是有效数值`)
  }
  return n
}

function optionalNumber(
  value: unknown,
  label: string,
): number | undefined {
  if (value == null || value === '') return undefined
  return asNumber(value, label)
}

function optionalString(
  value: unknown,
  label: string,
): string | undefined {
  if (value == null || value === '') return undefined
  return asString(value, label)
}

/** 允许 null（业务通报无权威数值时字段为 null） */
function optionalNullableNumber(
  value: unknown,
  label: string,
): number | null {
  if (value == null || value === '') return null
  return asNumber(value, label)
}

const COORDINATE_TYPES: readonly CoordinateType[] = [
  'authoritative',
  'geocoded-location',
  'approximate-for-visualization',
]

const SOURCE_TYPES: readonly SourceType[] = [
  'historical-track',
  'operational-bulletin',
  'satellite',
  'risk-data',
  'base-map',
  'derived-analysis',
]

function parseRealTrack(
  features: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>[],
): RealTrackPoint[] {
  return features
    .map((f, i) => {
      const p = f.properties
      const where = `track.geojson 第 ${i + 1} 个要素`
      return {
        id: asString(p.id, `${where}.id`),
        timestamp: asString(p.timestamp, `${where}.timestamp`),
        longitude: asNumber(p.longitude, `${where}.longitude`),
        latitude: asNumber(p.latitude, `${where}.latitude`),
        centralPressure: asNumber(p.centralPressure, `${where}.centralPressure`),
        maxWindSpeed: asNumber(p.maxWindSpeed, `${where}.maxWindSpeed`),
        intensity: asString(p.intensity, `${where}.intensity`),
        source: asString(p.source, `${where}.source`),
        grade: optionalString(p.grade, `${where}.grade`),
        movementDirection: optionalNumber(p.movementDirection, `${where}.movementDirection`),
        movementSpeed: optionalNumber(p.movementSpeed, `${where}.movementSpeed`),
        windRadius7: optionalNumber(p.windRadius7, `${where}.windRadius7`),
        windRadius10: optionalNumber(p.windRadius10, `${where}.windRadius10`),
        windRadius12: optionalNumber(p.windRadius12, `${where}.windRadius12`),
      }
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

function parseLandfalls(
  features: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>[],
): LandfallPoint[] {
  return features.map((f, i) => {
    const p = f.properties
    const where = `landfalls.geojson 第 ${i + 1} 个要素`
    const coordinateType = asString(p.coordinateType, `${where}.coordinateType`) as CoordinateType
    if (!COORDINATE_TYPES.includes(coordinateType)) {
      throw new Error(`${where}.coordinateType 取值非法：${coordinateType}`)
    }
    const sourceType = asString(p.sourceType, `${where}.sourceType`) as SourceType
    if (!SOURCE_TYPES.includes(sourceType)) {
      throw new Error(`${where}.sourceType 取值非法：${sourceType}`)
    }
    const sequence = asNumber(p.sequence, `${where}.sequence`)
    if (!Number.isInteger(sequence) || sequence < 1) {
      throw new Error(`${where}.sequence 必须为 ≥1 的整数`)
    }
    return {
      id: asString(p.id, `${where}.id`),
      sequence,
      timestamp: asString(p.timestamp, `${where}.timestamp`),
      longitude: asNumber(p.longitude, `${where}.longitude`),
      latitude: asNumber(p.latitude, `${where}.latitude`),
      locationName: asString(p.locationName, `${where}.locationName`),
      province: optionalString(p.province, `${where}.province`),
      cityOrCounty: optionalString(p.cityOrCounty, `${where}.cityOrCounty`),
      intensity: asString(p.intensity, `${where}.intensity`),
      maxWindSpeed: optionalNullableNumber(p.maxWindSpeed, `${where}.maxWindSpeed`),
      centralPressure: optionalNullableNumber(p.centralPressure, `${where}.centralPressure`),
      source: asString(p.source, `${where}.source`),
      sourceType,
      sourceUrl: optionalString(p.sourceUrl, `${where}.sourceUrl`),
      coordinateType,
      notes: optionalString(p.notes, `${where}.notes`),
    }
  })
}

function parseWindRadii(
  features: GeoJSON.Feature<GeoJSON.Polygon, Record<string, unknown>>[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps> {
  return {
    type: 'FeatureCollection',
    features: features.map((f, i) => {
      const p = f.properties
      const where = `wind-radii.geojson 第 ${i + 1} 个要素`
      const level = asNumber(p.level, `${where}.level`)
      if (level !== 7 && level !== 10 && level !== 12) {
        throw new Error(`${where}.level 必须为 7 / 10 / 12，实际为 ${level}`)
      }
      return {
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          pointId: asString(p.pointId, `${where}.pointId`),
          level,
          radius: asNumber(p.radius, `${where}.radius`),
          label: RING_LABELS[level],
        },
      }
    }),
  }
}

/** 真实轨迹点 → 规范轨迹点（地图 / 图表统一模型） */
function adaptRealTrack(real: RealTrackPoint[]): TyphoonPoint[] {
  return real.map((p) => ({
    id: p.id,
    lon: p.longitude,
    lat: p.latitude,
    time: p.timestamp,
    wind: p.maxWindSpeed,
    pressure: p.centralPressure,
    category: p.intensity || p.grade || typhoonCategoryByWind(p.maxWindSpeed),
    r7: p.windRadius7 ?? 0,
    r10: p.windRadius10 ?? 0,
    r12: p.windRadius12 ?? 0,
    source: p.source,
    grade: p.grade,
    movementDirection: p.movementDirection,
    movementSpeed: p.movementSpeed,
  }))
}

async function loadRealCase(tc: TyphoonCase): Promise<CaseLoadResult> {
  try {
    const base = `${DATA_BASE}${tc.dataDir}/`
    const manifest = await fetchJson<CaseManifest>(`${base}manifest.json`)
    if (manifest.id !== tc.id) {
      throw new Error(`manifest.id（${manifest.id}）与案例配置（${tc.id}）不一致`)
    }
    const sourcesFile = await fetchJson<SourcesFile>(`${base}${manifest.files.sources}`)
    const sources = sourcesFile.sources ?? []

    // 真实数据未就绪：明确返回 unavailable，绝不回退 DEMO
    if (manifest.status !== 'available') {
      return {
        status: 'unavailable',
        reason:
          `案例“${tc.chineseName}”的数据状态为 ${manifest.status}：` +
          '真实数据尚未接入，系统不会用演示数据替代，请等待权威数据录入。',
        caseInfo: tc,
        sources,
      }
    }

    const trackFile = await fetchJson<RealTrackFile>(`${base}${manifest.files.track}`)
    if ((trackFile.status ?? 'available') !== 'available') {
      return {
        status: 'unavailable',
        reason: `轨迹数据状态为 ${trackFile.status}（${manifest.files.track}）`,
        caseInfo: tc,
        sources,
      }
    }
    const realTrack = parseRealTrack(trackFile.features)
    if (realTrack.length === 0) {
      throw new Error('track.geojson 状态为 available，但没有轨迹要素')
    }

    const warnings: string[] = []

    // 登陆点：可选。未就绪时不阻断 REAL 模式，但必须明确提示，绝不伪造。
    const landfallFile = await fetchJson<RealLandfallFile>(
      `${base}${manifest.files.landfalls}`,
    )
    let landfalls: LandfallPoint[] = []
    if ((landfallFile.status ?? 'available') === 'available') {
      landfalls = parseLandfalls(landfallFile.features)
    } else {
      warnings.push(
        `登陆点数据未就绪（status=${landfallFile.status}），本页暂不显示登陆点（未伪造数据）`,
      )
    }

    // 风圈：优先 wind-radii.geojson，其次轨迹点 windRadius 字段，允许缺失
    let windRings: GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps> | null = null
    const radiiFile = await fetchJson<RealWindRadiiFile>(`${base}${manifest.files.windRadii}`)
    if ((radiiFile.status ?? 'available') === 'available' && radiiFile.features.length > 0) {
      windRings = parseWindRadii(radiiFile.features)
    } else if ((radiiFile.status ?? 'available') !== 'available') {
      warnings.push(
        `风圈数据未就绪（status=${radiiFile.status}），回退到轨迹点 windRadius 字段或显示为无`,
      )
    }

    const track = adaptRealTrack(realTrack)
    if (!windRings) {
      windRings = nonEmptyOrNull(buildWindRings(track))
    }

    // 环境观测资料（卫星云图 / SST）：未就绪时不阻断 REAL 模式，但必须明确提示，绝不伪造。
    let environment: EnvironmentData | null = null
    try {
      const satManifest = await fetchJson<EnvironmentManifest<SatelliteFrame>>(
        `${base}environment/satellite/manifest.json`,
      )
      const sstManifest = await fetchJson<EnvironmentManifest<SstFrame>>(
        `${base}environment/sst/manifest.json`,
      )
      const envSourcesFile = await fetchJson<SourcesFile>(`${base}environment/sources.json`)
      const satAvailable = satManifest.status === 'available'
      const sstAvailable = sstManifest.status === 'available'
      environment = {
        status: satAvailable || sstAvailable ? 'available' : 'awaiting-authoritative-data',
        satellite: satAvailable ? satManifest.frames : [],
        sst: sstAvailable ? sstManifest.frames : [],
        sources: envSourcesFile.sources ?? [],
        note: satManifest.note ?? sstManifest.note ?? '',
      }
      if (!satAvailable) {
        warnings.push('环境观测资料：真实卫星云图待接入（FY-4B AGRI，需人工下载，见 public/data/raw/nsmc/README.md）')
      }
      if (!sstAvailable) {
        warnings.push('环境观测资料：真实海表温度 SST 待接入（FY-4B AGRI SST，需人工下载）')
      }
    } catch (error) {
      environment = {
        status: 'awaiting-authoritative-data',
        satellite: [],
        sst: [],
        sources: [],
        note: '环境观测资料未就绪',
      }
      warnings.push(`环境观测资料未就绪：${errorMessage(error)}`)
    }

    // 风险分析（科普型空间风险提示）：未就绪不阻断 REAL 模式，明确提示。
    let risk: RiskData | null = null
    try {
      const grid = await fetchJson<RiskGrid>(`${base}risk/grid.json`)
      const riskSourcesFile = await fetchJson<SourcesFile>(`${base}risk/sources.json`)
      const layerIds = ['terrain', 'population', 'proximity', 'attention'] as const
      const layers: RiskData['layers'] = {}
      for (const id of layerIds) {
        try {
          const m = await fetchJson<RiskLayerInfo>(`${base}risk/${id}/manifest.json`)
          layers[id] = m
        } catch {
          warnings.push(`风险图层 ${id} 未就绪，已跳过`)
        }
      }
      risk = {
        status: 'available',
        layers,
        grid,
        sources: riskSourcesFile.sources ?? [],
        disclaimer: grid.meta.disclaimer,
      }
    } catch (error) {
      risk = null
      warnings.push(`风险分析数据未就绪：${errorMessage(error)}`)
    }

    // 机制示意（02 章节）：纯科普示意数据，非真实大气分析场。
    let schematic: SchematicData | null = null
    try {
      const steering = await fetchJson<GeoJSON.FeatureCollection>(
        `${base}schematic/steering-schematic.geojson`,
      )
      const uncertainty = await fetchJson<GeoJSON.FeatureCollection>(
        `${base}schematic/forecast-uncertainty-schematic.geojson`,
      )
      schematic = {
        steering,
        uncertainty,
        note: '机制示意，不代表 YAGI 当时真实大气分析场；预测路径为不确定性示意，非真实集合预报。',
      }
    } catch {
      schematic = null
      warnings.push('机制示意图层未就绪，已跳过（不影响其余内容）')
    }

    const data: ActiveMapData = {
      kind: 'real',
      caseInfo: tc,
      track,
      trackPoints: buildTrackPoints(track),
      trackLine: buildTrackLine(track),
      windRings,
      landfalls,
      riskZones: null,
      shelters: null,
      sources,
      warnings,
      events: buildLandfallEvents(landfalls),
      environment,
      risk,
      schematic,
    }
    return { status: 'ready', data }
  } catch (error) {
    return { status: 'error', message: errorMessage(error), caseInfo: tc }
  }
}

/** 统一入口：按案例配置加载（DEMO / REAL 分流） */
export async function loadCase(tc: TyphoonCase): Promise<CaseLoadResult> {
  return tc.kind === 'demo' ? loadDemoCase(tc) : loadRealCase(tc)
}
