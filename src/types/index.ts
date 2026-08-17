/**
 * 全局类型定义：所有数据结构的唯一权威来源。
 * 新增数据时请先更新这里，再写 loader / UI。
 */

/** 六大核心章节 id */
export type ChapterId = 'origin' | 'track' | 'landfall' | 'risk' | 'ai' | 'action'

/** 章节配置 */
export interface Chapter {
  id: ChapterId
  /** 编号，如 "01" */
  index: string
  /** 核心问题 */
  question: string
  title: string
  subtitle: string
  /** 章节要点（静态科普文案，暂不涉及具体数据） */
  keyPoints: string[]
  /** 选择本章节时默认开启的地图图层 */
  defaultLayers: LayerId[]
  /** 与下一章节之间的故事过渡语（第六章无） */
  nextHint?: string
}

/** 地图图层 id */
export type LayerId =
  | 'track'
  | 'windRadii'
  | 'satellite'
  | 'riskZones'
  | 'landfalls'
  | 'shelters'
  | 'envSatellite'
  | 'envSst'
  | 'riskTerrain'
  | 'riskPopulation'
  | 'riskProximity'
  | 'riskAttention'
  | 'steeringSchematic'
  | 'uncertaintySchematic'

/** 图层控制面板中的图层定义 */
export interface LayerDef {
  id: LayerId
  label: string
  /** 图例色块颜色 */
  color: string
  hint: string
  /** 仅 DEMO 模式使用（REAL 模式在图层面板中隐藏，避免演示图层混入正式案例） */
  demoOnly?: boolean
}

/**
 * 规范轨迹点：地图 / 时间轴 / 图表共用的统一模型。
 * DEMO 与 REAL 数据源都会适配为该结构（见 loaders）。
 * 允许任意时间间隔与任意数量，UI 不假设固定步长。
 */
export interface TyphoonPoint {
  id: string
  lon: number
  lat: number
  /** ISO 8601 时间 */
  time: string
  /** 中心附近最大风速 m/s */
  wind: number
  /** 中心气压 hPa */
  pressure: number
  /** 台风等级名称 */
  category: string
  /** 七级风圈半径 km，0 表示不存在该风圈 */
  r7: number
  /** 十级风圈半径 km */
  r10: number
  /** 十二级风圈半径 km */
  r12: number
  /* ---- 可选字段（真实数据源可能缺失，必须安全处理） ---- */
  source?: string
  grade?: string
  movementDirection?: number
  movementSpeed?: number
}

/** 风险类型：低洼城区 / 山洪沟谷 / 沿海岸段 / 人口密集区 */
export type RiskType = 'lowland' | 'torrent' | 'coast' | 'urban'

/** 风险分区要素属性 */
export interface RiskZone {
  id: string
  name: string
  riskType: RiskType
  riskLevel: 'high' | 'medium' | 'low'
  note: string
}

/** 避险点要素属性 */
export interface Shelter {
  id: string
  name: string
  kind: string
  capacity: number
}

/** 风圈要素属性（可由轨迹点半径运行时生成，也可来自 wind-radii.geojson） */
export interface WindRingProps {
  pointId: string
  /** 风圈等级：7 / 10 / 12 */
  level: number
  /** 半径 km */
  radius: number
  /** 中文名，如 "七级风圈" */
  label: string
}

/* ==================== 真实台风案例机制 ==================== */

/** 案例类型：演示 / 真实 */
export type CaseKind = 'demo' | 'real'

/** 数据状态：就绪 / 等待权威数据 */
export type DataStatus = 'available' | 'awaiting-authoritative-data'

/**
 * 真实台风轨迹点（track.geojson 的 properties，字段与权威数据源对齐）。
 * 不同权威数据源可能缺字段，因此除必需字段外全部可选。
 */
export interface RealTrackPoint {
  id: string
  /** ISO 8601 UTC */
  timestamp: string
  longitude: number
  latitude: number
  /** 中心气压 hPa */
  centralPressure: number
  /** 中心附近最大风速 m/s */
  maxWindSpeed: number
  /** 等级名称，如 "超强台风" */
  intensity: string
  /** 来源标识，如 "CMA-BST" */
  source: string
  /* ---- 可选 ---- */
  grade?: string
  movementDirection?: number
  movementSpeed?: number
  windRadius7?: number
  windRadius10?: number
  windRadius12?: number
}

/** 数据来源类型：严格区分历史路径与业务通报等不同口径 */
export type SourceType =
  | 'historical-track'
  | 'operational-bulletin'
  | 'satellite'
  | 'ocean-observation'
  | 'risk-data'
  | 'terrain'
  | 'population'
  | 'base-map'
  | 'derived-analysis'

/** 坐标性质：权威坐标 / 地点名称地理编码 / 近似（仅可视化） */
export type CoordinateType =
  | 'authoritative'
  | 'geocoded-location'
  | 'approximate-for-visualization'

/** 登陆点（landfalls.geojson 的 properties） */
export interface LandfallPoint {
  id: string
  /** 登陆次序，1 为首次登陆 */
  sequence: number
  timestamp: string
  longitude: number
  latitude: number
  locationName: string
  province?: string
  cityOrCounty?: string
  intensity: string
  /** 登陆时最大风速 m/s；业务通报无权威数值时为 null */
  maxWindSpeed: number | null
  /** 登陆时中心气压 hPa；业务通报无权威数值时为 null */
  centralPressure: number | null
  source: string
  sourceType: SourceType
  sourceUrl?: string
  coordinateType: CoordinateType
  notes?: string
}

/** 数据来源记录 */
export interface SourceInfo {
  organization: string
  datasetName: string
  url: string
  accessDate: string
  description: string
  licenseOrUsageNote: string
  /** 角色：primary = 主数据来源，cross-validation = 交叉核验 */
  role?: string
  /** 适用数据范围说明 */
  scope?: string
  /** 来源类型（历史路径 / 业务通报 / 卫星 / 海洋观测 / 风险 / 底图 / 衍生分析） */
  sourceType?: SourceType
}

/* ==================== 环境观测资料（卫星云图 / SST） ==================== */

/** 卫星图像帧（FY-4B AGRI 图像产品等；timestamp 为 UTC） */
export interface SatelliteFrame {
  id: string
  timestamp: string
  satellite: string
  instrument: string
  product: string
  /** 相对 public/data/ 的路径 */
  imagePath: string
  /** [west, south, east, north] */
  bbox: [number, number, number, number]
  source: string
  sourceUrl: string
  sourceType: SourceType
  /** 处理步骤（裁剪/重投影/色带/格式转换必须记录；不得描述为“原始卫星数据”） */
  processing: string[]
  caption: string
}

/** 海表温度帧（单位 °C，日尺度） */
export interface SstFrame {
  id: string
  /** YYYY-MM-DD（UTC） */
  date: string
  satellite: string
  instrument: string
  product: string
  imagePath: string
  bbox: [number, number, number, number]
  unit: string
  valueRange?: [number, number]
  source: string
  sourceUrl: string
  sourceType: SourceType
  processing: string[]
  legend: string
}

/** 环境观测数据包（satellite / sst 两个 manifest 的组合结果） */
export interface EnvironmentData {
  status: 'available' | 'awaiting-authoritative-data'
  satellite: SatelliteFrame[]
  sst: SstFrame[]
  sources: SourceInfo[]
  note: string
}

/** 环境 manifest 文件结构 */
export interface EnvironmentManifest<T> {
  schemaVersion: number
  status: 'available' | 'awaiting-authoritative-data'
  note?: string
  frames: T[]
}

/* ==================== 风险分析（科普型空间风险提示） ==================== */

/** 风险图层的展示信息（与地图渲染解耦） */
export interface RiskLayerInfo {
  id: string
  label: string
  imagePath: string
  bbox: [number, number, number, number]
  legend: string
  source: string
  sourceUrl: string
  sourceType: SourceType
  processing: string[]
  disclaimer?: string
  year?: number
  resolution?: string
  unit?: string
}

/** 点击查询用查找网格 */
export interface RiskGrid {
  meta: {
    bbox: [number, number, number, number]
    resolution: number
    rows: number
    cols: number
    disclaimer: string
  }
  lats: number[]
  lons: number[]
  elevation: Array<number | null>
  popDensity: number[]
  distKm: number[]
  land: number[]
  attention: number[]
  terrainClass: number[]
  popClass: number[]
  proxClass: number[]
}

/** 风险分析数据包（REAL 案例专用；DEMO 为 null） */
export interface RiskData {
  status: 'available' | 'unavailable'
  layers: {
    terrain?: RiskLayerInfo
    population?: RiskLayerInfo
    proximity?: RiskLayerInfo
    attention?: RiskLayerInfo
  }
  grid: RiskGrid | null
  sources: SourceInfo[]
  disclaimer: string
  note?: string
}

/** 点击查询结果 */
export interface RiskQuery {
  lon: number
  lat: number
  /** 点击位置不在分析区（AOI）内 */
  outOfAoi?: boolean
  isLand: boolean
  elevation: number | null
  popDensity: number
  distKm: number
  terrainLabel: string
  popLabel: string
  proxLabel: string
  attentionLabel: string
  attentionLevel: number
  disclaimer: string
}

/* ==================== 机制示意（02 章节，非真实大气分析场） ==================== */

/** 机制示意图层数据：纯科普示意，绝不冒充真实观测/分析场 */
export interface SchematicData {
  steering: GeoJSON.FeatureCollection | null
  uncertainty: GeoJSON.FeatureCollection | null
  note: string
}

/** 通用台风事件（本轮真实实现 landfall，其余类型为后续预留） */
export type TyphoonEventType =
  | 'genesis'
  | 'intensification'
  | 'landfall'
  | 'weakening'
  | 'transition'
  | 'custom'

export interface TyphoonEvent {
  id: string
  /** ISO 8601 UTC，与轨迹时间轴共用统一时间基准 */
  timestamp: string
  type: TyphoonEventType
  title: string
  description: string
  coordinates?: [number, number]
  source?: string
  /** 时间轴标记的短标签，如 "登陆1" */
  shortLabel?: string
}

/** 台风案例配置（注册表项，不含任何轨迹数值） */
export interface TyphoonCase {
  id: string
  kind: CaseKind
  chineseName: string
  englishName: string
  year: number | null
  /** 编号，如 "2411" */
  typhoonNumber: string | null
  basin: string
  /** 数据接入后填写 */
  startTime: string | null
  endTime: string | null
  description: string
  dataStatus: DataStatus
  /** 数据目录（相对 public/data/） */
  dataDir: string
  /** 注册表内的来源兜底；真实案例以 sources.json 为准 */
  sources: SourceInfo[]
}

/** 真实案例数据包清单（manifest.json） */
export interface CaseManifest {
  schemaVersion: number
  id: string
  status: DataStatus
  files: {
    track: string
    landfalls: string
    windRadii: string
    sources: string
  }
}

/** 当前展示在地图上的数据集（由 loader 统一产出，UI 只消费该结构） */
export interface ActiveMapData {
  kind: CaseKind
  caseInfo: TyphoonCase
  track: TyphoonPoint[]
  trackPoints: GeoJSON.FeatureCollection<GeoJSON.Point, TyphoonPoint>
  trackLine: GeoJSON.Feature<GeoJSON.LineString>
  windRings: GeoJSON.FeatureCollection<GeoJSON.Polygon, WindRingProps> | null
  landfalls: LandfallPoint[]
  riskZones: GeoJSON.FeatureCollection<GeoJSON.Polygon, RiskZone> | null
  shelters: GeoJSON.FeatureCollection<GeoJSON.Point, Shelter> | null
  sources: SourceInfo[]
  /** 数据完整性提示（如：登陆点/风圈尚未接入），前端必须展示，不得静默忽略 */
  warnings: string[]
  /** 台风事件（由登陆点等真实数据生成，本轮仅 landfall） */
  events: TyphoonEvent[]
  /** 环境观测资料（卫星云图 / SST）；demo 案例为 null */
  environment: EnvironmentData | null
  /** 风险分析（科普型空间风险提示）；demo 案例为 null */
  risk: RiskData | null
  /** 机制示意（02 章节）；demo 案例为 null */
  schematic: SchematicData | null
}

/** 数据加载状态（unavailable = 真实数据待接入，绝不静默回退 DEMO） */
export type LoadState = 'loading' | 'ready' | 'unavailable' | 'error'

/** 带 demo 标记的 FeatureCollection（GeoJSON 允许 foreign member，@types/geojson 未内置该字段） */
export type DemoFeatureCollection<
  G extends GeoJSON.Geometry,
  P,
> = GeoJSON.FeatureCollection<G, P> & { demo: true }
