import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  RasterLayerSpecification,
  RasterSourceSpecification,
} from 'maplibre-gl'
import type { LayerId } from '../types'
import {
  SATELLITE_ATTRIBUTION,
  SATELLITE_TILE_SIZE,
  SATELLITE_TILE_URL,
  TIANDITU_ATTRIBUTION,
} from './mapConfig'

/**
 * 地图样式层定义（与数据加载、UI 组件解耦）。
 * 图层 id 与数据源 id 全部集中在此，便于统一管理。
 */

/* ---------- 数据源 id ---------- */
export const SOURCE_IDS = {
  track: 'case-track',
  position: 'case-position',
  windRings: 'case-wind-rings',
  riskZones: 'case-risk-zones',
  shelters: 'case-shelters',
  landfalls: 'case-landfalls',
  satellite: 'demo-satellite',
  envSatellite: 'env-satellite',
  envSst: 'env-sst',
  riskTerrain: 'risk-terrain',
  riskPopulation: 'risk-population',
  riskProximity: 'risk-proximity',
  riskAttention: 'risk-attention',
  steeringSchematic: 'schematic-steering',
  uncertaintySchematic: 'schematic-uncertainty',
  riskAoi: 'risk-aoi',
} as const

/* ---------- 图层 id ---------- */
export const LAYER_IDS = {
  windRingsFill: 'case-wind-rings-fill',
  windRingsOutline: 'case-wind-rings-outline',
  satellite: 'demo-satellite-layer',
  trackLine: 'case-track-line',
  riskZones: 'case-risk-zones',
  trackPoints: 'case-track-points',
  shelters: 'case-shelters',
  landfallHalo: 'case-landfalls-halo',
  landfallCore: 'case-landfalls-core',
  position: 'case-position',
  envSatellite: 'env-satellite-layer',
  envSst: 'env-sst-layer',
  riskTerrain: 'risk-terrain-layer',
  riskPopulation: 'risk-population-layer',
  riskProximity: 'risk-proximity-layer',
  riskAttention: 'risk-attention-layer',
  steeringFill: 'schematic-steering-fill',
  steeringLine: 'schematic-steering-line',
  steeringFlow: 'schematic-steering-flow',
  steeringRecurve: 'schematic-steering-recurve',
  steeringHit: 'schematic-steering-hit',
  uncertaintyLines: 'schematic-uncertainty-lines',
  uncertaintyHit: 'schematic-uncertainty-hit',
  riskAoiFill: 'risk-aoi-fill',
  riskAoiLine: 'risk-aoi-line',
} as const

export const RISK_LEVEL_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#e64545',
  medium: '#f2a33c',
  low: '#f7d154',
}

export function buildTrackLineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.trackLine,
    type: 'line',
    source: SOURCE_IDS.track,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#35c8ff', 'line-width': 2.5, 'line-opacity': 0.9 },
  }
}

export function buildTrackPointsLayer(): CircleLayerSpecification {
  return {
    id: LAYER_IDS.trackPoints,
    type: 'circle',
    source: SOURCE_IDS.track,
    paint: {
      'circle-radius': 3.6,
      'circle-color': '#e8f1f8',
      'circle-stroke-color': '#35c8ff',
      'circle-stroke-width': 1.6,
    },
  }
}

/** 当前台风位置标记（随时间轴移动） */
export function buildPositionLayer(): CircleLayerSpecification {
  return {
    id: LAYER_IDS.position,
    type: 'circle',
    source: SOURCE_IDS.position,
    paint: {
      'circle-radius': 7,
      'circle-color': '#ffd166',
      'circle-stroke-color': '#081426',
      'circle-stroke-width': 2.5,
    },
  }
}

export function buildWindRingsFillLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.windRingsFill,
    type: 'fill',
    source: SOURCE_IDS.windRings,
    paint: {
      'fill-color': '#35c8ff',
      'fill-opacity': [
        'match',
        ['get', 'level'],
        12,
        0.1,
        10,
        0.07,
        0.05,
      ],
    },
  }
}

export function buildWindRingsOutlineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.windRingsOutline,
    type: 'line',
    source: SOURCE_IDS.windRings,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#7dd8ff',
      'line-width': 1,
      'line-opacity': 0.35,
      'line-dasharray': [2, 2],
    },
  }
}

export function buildSatelliteLayer(): RasterLayerSpecification {
  return {
    id: LAYER_IDS.satellite,
    type: 'raster',
    source: SOURCE_IDS.satellite,
    minzoom: 3,
    maxzoom: 10,
    paint: { 'raster-opacity': 0.55, 'raster-fade-duration': 300 },
  }
}

export function buildRiskZonesLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.riskZones,
    type: 'fill',
    source: SOURCE_IDS.riskZones,
    paint: {
      'fill-color': [
        'match',
        ['get', 'riskLevel'],
        'high',
        RISK_LEVEL_COLORS.high,
        'medium',
        RISK_LEVEL_COLORS.medium,
        RISK_LEVEL_COLORS.low,
      ],
      'fill-opacity': 0.32,
      'fill-outline-color': [
        'match',
        ['get', 'riskLevel'],
        'high',
        RISK_LEVEL_COLORS.high,
        'medium',
        RISK_LEVEL_COLORS.medium,
        RISK_LEVEL_COLORS.low,
      ],
    },
  }
}

export function buildSheltersLayer(): CircleLayerSpecification {
  return {
    id: LAYER_IDS.shelters,
    type: 'circle',
    source: SOURCE_IDS.shelters,
    paint: {
      'circle-radius': 5,
      'circle-color': '#2ee6a8',
      'circle-stroke-color': '#081426',
      'circle-stroke-width': 1.5,
    },
  }
}

/** 登陆点：外圈光晕（highlighted=true 时放大并转为黄色光晕） */
export function buildLandfallHaloLayer(): CircleLayerSpecification {
  return {
    id: LAYER_IDS.landfallHalo,
    type: 'circle',
    source: SOURCE_IDS.landfalls,
    paint: {
      'circle-radius': ['case', ['get', 'highlighted'], 13, 9],
      'circle-color': [
        'case',
        ['get', 'highlighted'],
        'rgba(255, 209, 102, 0.55)',
        'rgba(230, 69, 69, 0.35)',
      ],
    },
  }
}

/** 登陆点：中心实心符号（highlighted=true 时放大加粗描边） */
export function buildLandfallCoreLayer(): CircleLayerSpecification {
  return {
    id: LAYER_IDS.landfallCore,
    type: 'circle',
    source: SOURCE_IDS.landfalls,
    paint: {
      'circle-radius': ['case', ['get', 'highlighted'], 8, 5.5],
      'circle-color': '#e64545',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': ['case', ['get', 'highlighted'], 3, 2],
    },
  }
}

/** 图层开关：业务图层 id → MapLibre 图层 id 列表 */
export const LAYER_TOGGLE_MAP: Array<{ id: LayerId; mapLayerIds: string[] }> = [
  { id: 'track', mapLayerIds: [LAYER_IDS.trackLine, LAYER_IDS.trackPoints] },
  { id: 'windRadii', mapLayerIds: [LAYER_IDS.windRingsFill, LAYER_IDS.windRingsOutline] },
  { id: 'satellite', mapLayerIds: [LAYER_IDS.satellite] },
  { id: 'riskZones', mapLayerIds: [LAYER_IDS.riskZones] },
  { id: 'landfalls', mapLayerIds: [LAYER_IDS.landfallHalo, LAYER_IDS.landfallCore] },
  { id: 'shelters', mapLayerIds: [LAYER_IDS.shelters] },
  { id: 'envSatellite', mapLayerIds: [LAYER_IDS.envSatellite] },
  { id: 'envSst', mapLayerIds: [LAYER_IDS.envSst] },
  { id: 'riskTerrain', mapLayerIds: [LAYER_IDS.riskTerrain] },
  { id: 'riskPopulation', mapLayerIds: [LAYER_IDS.riskPopulation] },
  { id: 'riskProximity', mapLayerIds: [LAYER_IDS.riskProximity] },
  { id: 'riskAttention', mapLayerIds: [LAYER_IDS.riskAttention] },
  {
    id: 'steeringSchematic',
    mapLayerIds: [
      LAYER_IDS.steeringFill,
      LAYER_IDS.steeringLine,
      LAYER_IDS.steeringFlow,
      LAYER_IDS.steeringRecurve,
      LAYER_IDS.steeringHit,
    ],
  },
  {
    id: 'uncertaintySchematic',
    mapLayerIds: [LAYER_IDS.uncertaintyLines, LAYER_IDS.uncertaintyHit],
  },
]

export const SATELLITE_SOURCE_SPEC = {
  type: 'raster' as const,
  tiles: [SATELLITE_TILE_URL],
  tileSize: SATELLITE_TILE_SIZE,
  maxzoom: 10,
  attribution: SATELLITE_ATTRIBUTION,
}

/* ---------- 正式底图：天地图 WMTS 栅格（官方直连，无第三方代理） ---------- */

/** 天地图底图源/图层 id（独立于业务图层清理集合，跨案例保持） */
export const TIANDITU_SOURCE_IDS = { vec: 'tianditu-vec', cva: 'tianditu-cva' } as const
export const TIANDITU_LAYER_IDS = { vec: 'tianditu-vec-layer', cva: 'tianditu-cva-layer' } as const

/** 天地图 WMTS 栅格源（官方 t{s}.tianditu.gov.cn，直连官方服务） */
export function tiandituRasterSource(
  token: string,
  layer: 'vec' | 'cva',
): RasterSourceSpecification {
  const subs = ['0', '1', '2', '3', '4', '5', '6', '7']
  return {
    type: 'raster',
    tiles: subs.map(
      (s) =>
        `https://t${s}.tianditu.gov.cn/${layer}_w/wmts?tk=${encodeURIComponent(
          token,
        )}&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`,
    ),
    tileSize: 256,
    minzoom: 1,
    maxzoom: 18,
    attribution: TIANDITU_ATTRIBUTION,
  }
}

/** 天地图栅格图层（vec 矢量 + cva 注记叠加） */
export function buildTiandituLayer(layerId: string, sourceId: string): RasterLayerSpecification {
  return {
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
  }
}

/* ---------- 环境观测（真实卫星帧 / SST 单帧图像） ---------- */

/** 单帧地理图像源（bbox=[west, south, east, north] → 四角坐标） */
export function envImageSourceSpec(
  url: string,
  bbox: [number, number, number, number],
): { type: 'image'; url: string; coordinates: [[number, number], [number, number], [number, number], [number, number]] } {
  const [west, south, east, north] = bbox
  return {
    type: 'image',
    url,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  }
}

/** 真实卫星云图（可调透明度，不遮挡轨迹） */
export function buildEnvSatelliteLayer(): RasterLayerSpecification {
  return {
    id: LAYER_IDS.envSatellite,
    type: 'raster',
    source: SOURCE_IDS.envSatellite,
    paint: { 'raster-opacity': 0.7, 'raster-fade-duration': 0 },
  }
}

/** 真实海表温度 SST（独立色带，°C 图例见信息面板） */
export function buildEnvSstLayer(): RasterLayerSpecification {
  return {
    id: LAYER_IDS.envSst,
    type: 'raster',
    source: SOURCE_IDS.envSst,
    paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 },
  }
}

/* ---------- 风险分析图层（科普型空间风险提示） ---------- */

function buildRiskRasterLayer(layerId: string, sourceId: string): RasterLayerSpecification {
  return {
    id: layerId,
    type: 'raster',
    source: sourceId,
    paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 },
  }
}

export const buildRiskTerrainLayer = () =>
  buildRiskRasterLayer(LAYER_IDS.riskTerrain, SOURCE_IDS.riskTerrain)
export const buildRiskPopulationLayer = () =>
  buildRiskRasterLayer(LAYER_IDS.riskPopulation, SOURCE_IDS.riskPopulation)
export const buildRiskProximityLayer = () =>
  buildRiskRasterLayer(LAYER_IDS.riskProximity, SOURCE_IDS.riskProximity)
export const buildRiskAttentionLayer = () =>
  buildRiskRasterLayer(LAYER_IDS.riskAttention, SOURCE_IDS.riskAttention)

/* ---------- 机制示意图层（02 章节，纯科普示意，非真实大气分析场） ---------- */

/** 副高椭圆（示意）：橙色虚线框 */
export function buildSteeringFillLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.steeringFill,
    type: 'fill',
    source: SOURCE_IDS.steeringSchematic,
    filter: ['==', ['get', 'id'], 'ridge-ellipse'],
    paint: { 'fill-color': 'rgba(242, 163, 60, 0.08)' },
  }
}

export function buildSteeringLineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.steeringLine,
    type: 'line',
    source: SOURCE_IDS.steeringSchematic,
    filter: ['==', ['get', 'id'], 'ridge-ellipse'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#f2a33c', 'line-width': 2, 'line-dasharray': [1.5, 1.5] },
  }
}

/** 引导气流（示意）：西行箭头线 */
export function buildSteeringFlowLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.steeringFlow,
    type: 'line',
    source: SOURCE_IDS.steeringSchematic,
    filter: ['==', ['get', 'id'], 'steering-flow'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#f2a33c', 'line-width': 2.5, 'line-dasharray': [3, 1.5] },
  }
}

/** 转向气流（示意）：北上箭头线 */
export function buildSteeringRecurveLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.steeringRecurve,
    type: 'line',
    source: SOURCE_IDS.steeringSchematic,
    filter: ['==', ['get', 'id'], 'recurve-flow'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#f2a33c', 'line-width': 2.5, 'line-dasharray': [3, 1.5] },
  }
}

/** 预测不确定性（示意）：品红虚线扇面 */
export function buildUncertaintyLinesLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.uncertaintyLines,
    type: 'line',
    source: SOURCE_IDS.uncertaintySchematic,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ff6bd6', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
  }
}

/** 点击命中层：加宽近透明线，让细虚线更容易被点中 */
export function buildSchematicHitLayer(
  id: string,
  sourceId: string,
  lineWidth = 12,
): LineLayerSpecification {
  return {
    id,
    type: 'line',
    source: sourceId,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-width': lineWidth, 'line-opacity': 0.001, 'line-color': '#ffffff' },
  }
}

/* ---------- 风险分析区边界（AOI） ---------- */

/** AOI 轻微底色 */
export function buildRiskAoiFillLayer(): FillLayerSpecification {
  return {
    id: LAYER_IDS.riskAoiFill,
    type: 'fill',
    source: SOURCE_IDS.riskAoi,
    paint: { 'fill-color': 'rgba(255, 209, 102, 0.05)' },
  }
}

/** AOI 黄色虚线边界 */
export function buildRiskAoiLineLayer(): LineLayerSpecification {
  return {
    id: LAYER_IDS.riskAoiLine,
    type: 'line',
    source: SOURCE_IDS.riskAoi,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffd166', 'line-width': 2.5, 'line-dasharray': [4, 3], 'line-opacity': 0.95 },
  }
}
