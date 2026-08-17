import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl'
import type {
  ActiveMapData,
  LandfallPoint,
  LayerId,
  RiskQuery,
  RiskZone,
  SatelliteFrame,
  Shelter,
  SstFrame,
  TyphoonPoint,
} from '../../types'
import {
  FALLBACK_MAP_STYLE,
  MAP_ATTRIBUTION,
  MAP_CENTER,
  MAP_ZOOM,
  TIANDITU_TOKEN,
} from '../../services/mapConfig'
import {
  LAYER_IDS,
  LAYER_TOGGLE_MAP,
  SATELLITE_SOURCE_SPEC,
  SOURCE_IDS,
  TIANDITU_LAYER_IDS,
  TIANDITU_SOURCE_IDS,
  buildEnvSatelliteLayer,
  buildEnvSstLayer,
  buildLandfallCoreLayer,
  buildLandfallHaloLayer,
  buildPositionLayer,
  buildRiskAttentionLayer,
  buildRiskAoiFillLayer,
  buildRiskAoiLineLayer,
  buildRiskPopulationLayer,
  buildRiskProximityLayer,
  buildRiskTerrainLayer,
  buildRiskZonesLayer,
  buildSatelliteLayer,
  buildSchematicHitLayer,
  buildSheltersLayer,
  buildSteeringFillLayer,
  buildSteeringFlowLayer,
  buildSteeringLineLayer,
  buildSteeringRecurveLayer,
  buildTrackLineLayer,
  buildTrackPointsLayer,
  buildTiandituLayer,
  buildUncertaintyLinesLayer,
  buildWindRingsFillLayer,
  buildWindRingsOutlineLayer,
  envImageSourceSpec,
  tiandituRasterSource,
} from '../../services/layers'
import { buildLandfallFeatures, dataUrl } from '../../data/loaders'
import {
  COORDINATE_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_TYPE_LABELS,
  formatClock,
  formatDirection,
  formatPressure,
  formatRadiusKm,
  formatWind,
} from '../../utils/format'
import styles from './TyphoonMap.module.css'

interface TyphoonMapProps {
  data: ActiveMapData | null
  activeLayers: LayerId[]
  currentPointIndex: number
  /** 时间轴临近时应高亮的登陆点 id（不改变时间索引） */
  highlightLandfallIds: string[]
  /** 当前展示的真实卫星帧（时间轴最近帧） */
  satelliteFrame: SatelliteFrame | null
  /** 当前展示的真实 SST 帧（时间轴最近日期） */
  sstFrame: SstFrame | null
  /** 真实卫星云图透明度 */
  satelliteOpacity: number
  /** 点击地图（风险分析 AOI 内）时的查询回调 */
  onRiskQuery?: (query: RiskQuery | null) => void
  /** 递增信号：触发地图飞行定位到风险分析区 */
  flyToAoiSignal?: number
  /** 是否显示风险分析区边界（章节 04 打开时） */
  showRiskAoi?: boolean
}

/* ---------- Popup HTML（内联样式，保持组件零依赖） ---------- */

function trackPopupHtml(p: TyphoonPoint, isDemo: boolean): string {
  const sourceLine = p.source
    ? `<div>数据来源：${p.source}</div>`
    : isDemo
      ? `<div style="color:#5f7f97">演示数据</div>`
      : ''
  const movement =
    p.movementDirection != null
      ? `<div>移动方向：${formatDirection(p.movementDirection)}（${Math.round(
          p.movementDirection,
        )}°）${p.movementSpeed != null ? ` · ${p.movementSpeed} km/h` : ''}</div>`
      : ''
  return `
    <div style="min-width:180px">
      <div style="font-weight:700;color:#7dd8ff;margin-bottom:4px">${p.id} · ${p.category}</div>
      <div>北京时间：${formatClock(p.time, 8)}</div>
      <div>UTC：${formatClock(p.time, 0)}</div>
      <div>最大风速：${formatWind(p.wind)}</div>
      <div>中心气压：${formatPressure(p.pressure)}</div>
      <div>风圈：七级 ${formatRadiusKm(p.r7)} · 十级 ${formatRadiusKm(p.r10)} · 十二级 ${formatRadiusKm(p.r12)}</div>
      ${movement}
      ${sourceLine}
    </div>
  `
}

function landfallPopupHtml(l: LandfallPoint): string {
  const wind = l.maxWindSpeed != null ? formatWind(l.maxWindSpeed) : '—（通报无权威数值）'
  const pressure =
    l.centralPressure != null ? formatPressure(l.centralPressure) : '—（通报无权威数值）'
  const sourceLink = l.sourceUrl
    ? `<div><a href="${l.sourceUrl}" target="_blank" rel="noreferrer" style="color:#35c8ff">来源链接 ↗</a></div>`
    : ''
  const notes = l.notes
    ? `<div style="color:#5f7f97;font-size:10px;margin-top:4px;line-height:1.5">注：${l.notes}</div>`
    : ''
  return `
    <div style="min-width:210px">
      <div style="font-weight:700;color:#e64545;margin-bottom:4px">第${l.sequence}次登陆 · ${l.locationName}</div>
      <div>登陆日期：${formatClock(l.timestamp, 8).slice(0, 10)}</div>
      <div>北京时间：${formatClock(l.timestamp, 8)}</div>
      <div>UTC：${formatClock(l.timestamp, 0)}</div>
      <div>登陆强度：${l.intensity}</div>
      <div>最大风速：${wind}</div>
      <div>中心气压：${pressure}</div>
      <div>数据来源：${l.source}</div>
      <div>坐标性质：${COORDINATE_TYPE_LABELS[l.coordinateType]}</div>
      ${sourceLink}
      ${notes}
    </div>
  `
}

function riskPopupHtml(z: RiskZone): string {
  return `
    <div style="min-width:160px">
      <div style="font-weight:700;color:#f2a33c;margin-bottom:4px">${z.name}</div>
      <div>类型：${RISK_TYPE_LABELS[z.riskType]}</div>
      <div>等级：${RISK_LEVEL_LABELS[z.riskLevel]}</div>
      <div style="color:#9db8cc">${z.note}</div>
      <div style="color:#5f7f97;margin-top:4px">演示数据</div>
    </div>
  `
}

function shelterPopupHtml(s: Shelter): string {
  return `
    <div style="min-width:150px">
      <div style="font-weight:700;color:#2ee6a8;margin-bottom:4px">${s.name}</div>
      <div>类型：${s.kind}</div>
      <div>容量：约 ${s.capacity} 人</div>
      <div style="color:#5f7f97;margin-top:4px">演示数据</div>
    </div>
  `
}

function positionFeature(data: ActiveMapData): GeoJSON.Feature<GeoJSON.Point> {
  const p = data.track[0] ?? { lon: 0, lat: 0 }
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    properties: {},
  }
}

export default function TyphoonMap({
  data,
  activeLayers,
  currentPointIndex,
  highlightLandfallIds,
  satelliteFrame,
  sstFrame,
  satelliteOpacity,
  onRiskQuery,
  flyToAoiSignal = 0,
  showRiskAoi = false,
}: TyphoonMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const handlersAttachedRef = useRef(false)
  const dataRef = useRef<ActiveMapData | null>(null)
  const onRiskQueryRef = useRef<((query: RiskQuery | null) => void) | undefined>(undefined)
  const prevSchematicOnRef = useRef<{ steering: boolean; uncertainty: boolean }>({
    steering: false,
    uncertainty: false,
  })
  const [ready, setReady] = useState(false)
  /** 底图提示：null=正常；否则显示轻量提示（token 未配置 / 在线底图加载失败），不阻断核心内容 */
  const [basemapNotice, setBasemapNotice] = useState<string | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    onRiskQueryRef.current = onRiskQuery
  }, [onRiskQuery])

  /* 风险分析点击查询（科普型空间分析，非官方预警）——组件级函数，经 ref 读取最新数据 */
  const onClickRiskQuery = (e: maplibregl.MapMouseEvent) => {
    const risk = dataRef.current?.risk
    const callback = onRiskQueryRef.current
    if (!risk || !risk.grid || !callback) return
    const grid = risk.grid
    const lon = e.lngLat.lng
    const lat = e.lngLat.lat
    const [w, s, ea, n] = grid.meta.bbox
    if (lon < w || lon > ea || lat < s || lat > n) {
      // AOI 外也给出明确反馈（而不是静默无反应）
      callback({
        lon,
        lat,
        outOfAoi: true,
        isLand: false,
        elevation: null,
        popDensity: 0,
        distKm: 0,
        terrainLabel: '—',
        popLabel: '—',
        proxLabel: '—',
        attentionLabel: '—',
        attentionLevel: 1,
        disclaimer: grid.meta.disclaimer,
      })
      return
    }
    const col = Math.min(
      grid.meta.cols - 1,
      Math.max(0, Math.floor((lon - w) / grid.meta.resolution)),
    )
    const row = Math.min(
      grid.meta.rows - 1,
      Math.max(0, Math.floor((n - lat) / grid.meta.resolution)),
    )
    const idx = row * grid.meta.cols + col
    const isLand = grid.land[idx] === 1
    const terrainClass = grid.terrainClass[idx]
    const popClass = grid.popClass[idx]
    const proxClass = grid.proxClass[idx]
    const attentionLevel = grid.attention[idx]
    const attentionLabel =
      attentionLevel === 3 ? '重点关注' : attentionLevel === 2 ? '较高关注' : '一般关注'
    const terrainLabel = !isLand
      ? '海域'
      : terrainClass === 3
        ? '低洼（≤5 m）· 地形关注：高'
        : terrainClass === 2
          ? '5–10 m · 地形关注：中'
          : terrainClass === 1
            ? '>10 m · 地形关注：低'
            : '—'
    const popLabel =
      popClass === 3
        ? '高（≥2000 人/km²）'
        : popClass === 2
          ? '中（500–2000 人/km²）'
          : popClass === 1
            ? '低（<500 人/km²）'
            : '无人口数据'
    const proxLabel =
      proxClass === 3
        ? '≤50 km（高）'
        : proxClass === 2
          ? '50–100 km（中）'
          : proxClass === 1
            ? '100–150 km（低）'
            : '>150 km'
    callback({
      lon,
      lat,
      isLand,
      elevation: grid.elevation[idx],
      popDensity: grid.popDensity[idx],
      distKm: grid.distKm[idx],
      terrainLabel,
      popLabel,
      proxLabel,
      attentionLabel,
      attentionLevel,
      disclaimer: grid.meta.disclaimer,
    })
  }

  /* 初始化地图（仅一次） */
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = new maplibregl.Map({
      container,
      // 基础样式始终用本地纯色回退样式（无外部依赖）；天地图底图在 load 后按 token 叠加为栅格图层
      style: FALLBACK_MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left')
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: MAP_ATTRIBUTION }),
      'bottom-right',
    )
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      offset: 14,
      maxWidth: '280px',
    })

    map.on('load', () => {
      // 正式底图：已配置天地图 token 才加载官方瓦片（矢量 + 注记）；未配置则保持纯色背景并轻量提示
      if (TIANDITU_TOKEN) {
        try {
          map.addSource(TIANDITU_SOURCE_IDS.vec, tiandituRasterSource(TIANDITU_TOKEN, 'vec'))
          map.addLayer(buildTiandituLayer(TIANDITU_LAYER_IDS.vec, TIANDITU_SOURCE_IDS.vec))
          map.addSource(TIANDITU_SOURCE_IDS.cva, tiandituRasterSource(TIANDITU_TOKEN, 'cva'))
          map.addLayer(buildTiandituLayer(TIANDITU_LAYER_IDS.cva, TIANDITU_SOURCE_IDS.cva))
        } catch {
          /* 底图添加失败不影响核心数据层 */
        }
      } else {
        setBasemapNotice('正式底图服务尚未配置，核心科普数据仍可浏览。')
      }
      setReady(true)
    })
    map.on('error', (e) => {
      console.warn('[map]', e.error?.message ?? e.error)
      // 天地图瓦片加载失败（token 无效 / 网络问题）时轻量提示，不打断核心科普内容
      const sourceId = (e as { sourceId?: string }).sourceId
      if (
        TIANDITU_TOKEN &&
        (sourceId === TIANDITU_SOURCE_IDS.vec || sourceId === TIANDITU_SOURCE_IDS.cva)
      ) {
        setBasemapNotice('在线基础地图暂时无法加载，核心科普内容仍可浏览。')
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
      handlersAttachedRef.current = false
      setReady(false)
    }
  }, [])

  /* 数据源与图层（案例切换时先清理再重建，避免残留旧案例数据） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !data) return

    popupRef.current?.remove()

    const caseLayerIds = [
      LAYER_IDS.windRingsFill,
      LAYER_IDS.windRingsOutline,
      LAYER_IDS.satellite,
      LAYER_IDS.trackLine,
      LAYER_IDS.riskZones,
      LAYER_IDS.trackPoints,
      LAYER_IDS.shelters,
      LAYER_IDS.landfallHalo,
      LAYER_IDS.landfallCore,
      LAYER_IDS.position,
      LAYER_IDS.envSatellite,
      LAYER_IDS.envSst,
      LAYER_IDS.riskTerrain,
      LAYER_IDS.riskPopulation,
      LAYER_IDS.riskProximity,
      LAYER_IDS.riskAttention,
      LAYER_IDS.steeringFill,
      LAYER_IDS.steeringLine,
      LAYER_IDS.steeringFlow,
      LAYER_IDS.steeringRecurve,
      LAYER_IDS.steeringHit,
      LAYER_IDS.uncertaintyLines,
      LAYER_IDS.uncertaintyHit,
    ]
    for (const layerId of caseLayerIds) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
    }
    for (const sourceId of Object.values(SOURCE_IDS)) {
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }

    const hasTrack = data.track.length > 0

    map.addSource(SOURCE_IDS.track, { type: 'geojson', data: data.trackPoints })
    map.addLayer(buildTrackLineLayer())

    if (data.windRings) {
      map.addSource(SOURCE_IDS.windRings, { type: 'geojson', data: data.windRings })
      map.addLayer(buildWindRingsFillLayer())
      map.addLayer(buildWindRingsOutlineLayer())
    }

    // 演示卫星瓦片（NASA GIBS）仅 DEMO 使用；REAL 模式不接入，避免外部依赖与误当作真实云图
    if (data.kind === 'demo') {
      map.addSource(SOURCE_IDS.satellite, SATELLITE_SOURCE_SPEC)
      map.addLayer(buildSatelliteLayer())
    }

    if (data.riskZones) {
      map.addSource(SOURCE_IDS.riskZones, { type: 'geojson', data: data.riskZones })
      map.addLayer(buildRiskZonesLayer())
    }

    map.addLayer(buildTrackPointsLayer())

    if (data.shelters) {
      map.addSource(SOURCE_IDS.shelters, { type: 'geojson', data: data.shelters })
      map.addLayer(buildSheltersLayer())
    }

    if (data.landfalls.length > 0) {
      map.addSource(SOURCE_IDS.landfalls, {
        type: 'geojson',
        data: buildLandfallFeatures(data.landfalls),
      })
      map.addLayer(buildLandfallHaloLayer())
      map.addLayer(buildLandfallCoreLayer())
    }

    if (hasTrack) {
      map.addSource(SOURCE_IDS.position, { type: 'geojson', data: positionFeature(data) })
      map.addLayer(buildPositionLayer())
      const bounds = new maplibregl.LngLatBounds()
      for (const p of data.track) bounds.extend([p.lon, p.lat])
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 150, left: 60, right: 260 },
        maxZoom: 6.5,
        duration: 0,
      })
    }
  }, [ready, data])

  /* 环境观测图层：真实卫星帧 / SST 帧（按时间轴选择最近帧） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const applyImageLayer = (
      sourceId: string,
      layerId: string,
      frame: { imagePath: string; bbox: [number, number, number, number] } | null,
      layerSpec: maplibregl.RasterLayerSpecification,
      businessLayerId: LayerId,
    ) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
      if (!frame) return
      map.addSource(sourceId, envImageSourceSpec(dataUrl(frame.imagePath), frame.bbox))
      map.addLayer(layerSpec)
      const visible = activeLayers.includes(businessLayerId)
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    }

    if (data?.environment?.status === 'available') {
      applyImageLayer(
        SOURCE_IDS.envSatellite,
        LAYER_IDS.envSatellite,
        satelliteFrame,
        buildEnvSatelliteLayer(),
        'envSatellite',
      )
      applyImageLayer(SOURCE_IDS.envSst, LAYER_IDS.envSst, sstFrame, buildEnvSstLayer(), 'envSst')
    }
  }, [ready, data, satelliteFrame, sstFrame, activeLayers])

  /* 真实卫星云图透明度 */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (map.getLayer(LAYER_IDS.envSatellite)) {
      map.setPaintProperty(LAYER_IDS.envSatellite, 'raster-opacity', satelliteOpacity)
    }
  }, [ready, satelliteOpacity, satelliteFrame])

  /* 风险分析图层（科普型空间风险提示；数据就绪时叠加） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const applyRiskLayer = (
      sourceId: string,
      layerId: string,
      info: { imagePath: string; bbox: [number, number, number, number] } | undefined,
      layerSpec: maplibregl.RasterLayerSpecification,
      businessLayerId: LayerId,
    ) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
      if (!info) return
      map.addSource(sourceId, envImageSourceSpec(dataUrl(info.imagePath), info.bbox))
      map.addLayer(layerSpec)
      const visible = activeLayers.includes(businessLayerId)
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    }

    if (data?.risk?.status === 'available') {
      applyRiskLayer(SOURCE_IDS.riskTerrain, LAYER_IDS.riskTerrain, data.risk.layers.terrain, buildRiskTerrainLayer(), 'riskTerrain')
      applyRiskLayer(SOURCE_IDS.riskPopulation, LAYER_IDS.riskPopulation, data.risk.layers.population, buildRiskPopulationLayer(), 'riskPopulation')
      applyRiskLayer(SOURCE_IDS.riskProximity, LAYER_IDS.riskProximity, data.risk.layers.proximity, buildRiskProximityLayer(), 'riskProximity')
      applyRiskLayer(SOURCE_IDS.riskAttention, LAYER_IDS.riskAttention, data.risk.layers.attention, buildRiskAttentionLayer(), 'riskAttention')
    }
  }, [ready, data, activeLayers])

  /* 时间轴临近登陆事件时高亮对应登陆点（不改变时间索引、不强制跳转） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !data || data.landfalls.length === 0) return
    const source = map.getSource(SOURCE_IDS.landfalls) as GeoJSONSource | undefined
    if (!source) return
    source.setData(buildLandfallFeatures(data.landfalls, highlightLandfallIds))
  }, [highlightLandfallIds, ready, data])

  /* 点击弹窗与鼠标样式（每个地图实例仅挂载一次；图层 id 稳定，重建后依然生效） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || handlersAttachedRef.current) return
    handlersAttachedRef.current = true

    const setCursor = (layerId: string, on: boolean) => {
      if (map.getLayer(layerId)) map.getCanvas().style.cursor = on ? 'pointer' : ''
    }
    const popup = popupRef.current

    const showPopup = (lng: number, lat: number, html: string) => {
      if (popup) popup.setLngLat([lng, lat]).setHTML(html).addTo(map)
    }
    const pointCoordinates = (feature: maplibregl.MapGeoJSONFeature): [number, number] => {
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates
      return [lng, lat]
    }

    const onClickTrack = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      const isDemo = dataRef.current?.kind === 'demo'
      showPopup(
        ...pointCoordinates(feature),
        trackPopupHtml(feature.properties as unknown as TyphoonPoint, isDemo),
      )
    }
    const onClickRisk = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      showPopup(
        ...pointCoordinates(feature),
        riskPopupHtml(feature.properties as unknown as RiskZone),
      )
    }
    const onClickShelter = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      showPopup(
        ...pointCoordinates(feature),
        shelterPopupHtml(feature.properties as unknown as Shelter),
      )
    }
    const onClickLandfall = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      showPopup(
        ...pointCoordinates(feature),
        landfallPopupHtml(feature.properties as unknown as LandfallPoint),
      )
    }

    /* 机制示意弹窗（纯科普示意，非真实数据） */
    const onClickSchematic = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      const p = feature.properties as { label?: string; note?: string }
      showPopup(
        e.lngLat.lng,
        e.lngLat.lat,
        `<div style="min-width:190px">
          <div style="font-weight:700;color:#f2a33c;margin-bottom:4px">${p.label ?? '机制示意'}</div>
          <div style="color:#9db8cc">${p.note ?? ''}</div>
          <div style="color:#5f7f97;margin-top:4px">⚠ 机制示意，不代表真实大气分析场</div>
        </div>`,
      )
    }

    /* 风险分析区边界弹窗 */
    const onClickRiskAoi = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature) return
      const p = feature.properties as { label?: string; note?: string }
      showPopup(
        e.lngLat.lng,
        e.lngLat.lat,
        `<div style="min-width:200px">
          <div style="font-weight:700;color:#ffd166;margin-bottom:4px">${p.label ?? '风险分析区'}</div>
          <div style="color:#9db8cc">${p.note ?? ''}</div>
          <div style="color:#5f7f97;margin-top:4px">虚线框内点击可查询空间关注提示</div>
        </div>`,
      )
    }

    map.on('click', LAYER_IDS.trackPoints, onClickTrack)
    map.on('mouseenter', LAYER_IDS.trackPoints, () => setCursor(LAYER_IDS.trackPoints, true))
    map.on('mouseleave', LAYER_IDS.trackPoints, () => setCursor(LAYER_IDS.trackPoints, false))
    map.on('click', LAYER_IDS.riskZones, onClickRisk)
    map.on('mouseenter', LAYER_IDS.riskZones, () => setCursor(LAYER_IDS.riskZones, true))
    map.on('mouseleave', LAYER_IDS.riskZones, () => setCursor(LAYER_IDS.riskZones, false))
    map.on('click', LAYER_IDS.shelters, onClickShelter)
    map.on('mouseenter', LAYER_IDS.shelters, () => setCursor(LAYER_IDS.shelters, true))
    map.on('mouseleave', LAYER_IDS.shelters, () => setCursor(LAYER_IDS.shelters, false))
    map.on('click', LAYER_IDS.landfallCore, onClickLandfall)
    map.on('mouseenter', LAYER_IDS.landfallCore, () => setCursor(LAYER_IDS.landfallCore, true))
    map.on('mouseleave', LAYER_IDS.landfallCore, () => setCursor(LAYER_IDS.landfallCore, false))
    map.on('click', LAYER_IDS.steeringHit, onClickSchematic)
    map.on('click', LAYER_IDS.uncertaintyHit, onClickSchematic)
    map.on('mouseenter', LAYER_IDS.steeringHit, () => setCursor(LAYER_IDS.steeringHit, true))
    map.on('mouseleave', LAYER_IDS.steeringHit, () => setCursor(LAYER_IDS.steeringHit, false))
    map.on('mouseenter', LAYER_IDS.uncertaintyHit, () => setCursor(LAYER_IDS.uncertaintyHit, true))
    map.on('mouseleave', LAYER_IDS.uncertaintyHit, () => setCursor(LAYER_IDS.uncertaintyHit, false))
    map.on('click', LAYER_IDS.riskAoiLine, onClickRiskAoi)
    map.on('mouseenter', LAYER_IDS.riskAoiLine, () => setCursor(LAYER_IDS.riskAoiLine, true))
    map.on('mouseleave', LAYER_IDS.riskAoiLine, () => setCursor(LAYER_IDS.riskAoiLine, false))
  }, [ready])

  /* 风险分析区边界（AOI）：章节 04 打开时显示黄色虚线框 */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (map.getLayer(LAYER_IDS.riskAoiLine)) map.removeLayer(LAYER_IDS.riskAoiLine)
    if (map.getLayer(LAYER_IDS.riskAoiFill)) map.removeLayer(LAYER_IDS.riskAoiFill)
    if (map.getSource(SOURCE_IDS.riskAoi)) map.removeSource(SOURCE_IDS.riskAoi)

    if (!showRiskAoi) return
    const grid = data?.risk?.grid
    if (!grid) return
    const [w, s, e, n] = grid.meta.bbox
    const aoi: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]],
      },
      properties: {
        label: '风险分析区（海南北部—琼州海峡—雷州半岛）',
        note: '科普型空间分析范围，不属于官方灾害风险预报。',
      },
    }
    map.addSource(SOURCE_IDS.riskAoi, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [aoi] },
    })
    map.addLayer(buildRiskAoiFillLayer())
    map.addLayer(buildRiskAoiLineLayer())
  }, [ready, data, showRiskAoi])

  /* 风险点击查询：随风险数据可用性挂载/卸载（案例切换、HMR 后依然生效） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (!data?.risk?.grid) return
    map.on('click', onClickRiskQuery)
    return () => {
      map.off('click', onClickRiskQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data])

  /* 定位到风险分析区（AOI） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || flyToAoiSignal <= 0) return
    const grid = data?.risk?.grid
    if (!grid) return
    const [w, s, e, n] = grid.meta.bbox
    map.flyTo({
      center: [(w + e) / 2, (s + n) / 2],
      zoom: 8,
      duration: 1200,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToAoiSignal])

  /* 机制示意图层（02 章节：纯科普示意，非真实大气分析场） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const schematicLayerIds = [
      LAYER_IDS.steeringFill,
      LAYER_IDS.steeringLine,
      LAYER_IDS.steeringFlow,
      LAYER_IDS.steeringRecurve,
      LAYER_IDS.steeringHit,
      LAYER_IDS.uncertaintyLines,
      LAYER_IDS.uncertaintyHit,
    ]
    for (const id of schematicLayerIds) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    for (const id of [SOURCE_IDS.steeringSchematic, SOURCE_IDS.uncertaintySchematic]) {
      if (map.getSource(id)) map.removeSource(id)
    }

    const sc = data?.schematic
    if (!sc) return
    const applyVisibility = (layerIds: string[], businessId: LayerId) => {
      const visible = activeLayers.includes(businessId)
      for (const id of layerIds) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
      }
    }
    if (sc.steering) {
      map.addSource(SOURCE_IDS.steeringSchematic, { type: 'geojson', data: sc.steering })
      map.addLayer(buildSteeringFillLayer())
      map.addLayer(buildSteeringLineLayer())
      map.addLayer(buildSteeringFlowLayer())
      map.addLayer(buildSteeringRecurveLayer())
      map.addLayer(buildSchematicHitLayer(LAYER_IDS.steeringHit, SOURCE_IDS.steeringSchematic))
      applyVisibility(
        [
          LAYER_IDS.steeringFill,
          LAYER_IDS.steeringLine,
          LAYER_IDS.steeringFlow,
          LAYER_IDS.steeringRecurve,
          LAYER_IDS.steeringHit,
        ],
        'steeringSchematic',
      )
    }
    if (sc.uncertainty) {
      map.addSource(SOURCE_IDS.uncertaintySchematic, {
        type: 'geojson',
        data: sc.uncertainty,
      })
      map.addLayer(buildUncertaintyLinesLayer())
      map.addLayer(buildSchematicHitLayer(LAYER_IDS.uncertaintyHit, SOURCE_IDS.uncertaintySchematic))
      applyVisibility([LAYER_IDS.uncertaintyLines, LAYER_IDS.uncertaintyHit], 'uncertaintySchematic')
    }
  }, [ready, data, activeLayers])

  /* 开启示意图层时自动调整视野到示意图范围（否则示意可能位于当前视野之外） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const steeringOn = activeLayers.includes('steeringSchematic')
    const uncertaintyOn = activeLayers.includes('uncertaintySchematic')
    const prev = prevSchematicOnRef.current

    const fitTo = (fc: GeoJSON.FeatureCollection | null) => {
      if (!fc) return
      const bounds = new maplibregl.LngLatBounds()
      let any = false
      for (const f of fc.features) {
        const coords =
          f.geometry.type === 'LineString'
            ? (f.geometry.coordinates as number[][])
            : ((f.geometry as GeoJSON.Polygon).coordinates.flat() as number[][])
        for (const c of coords) {
          bounds.extend([c[0], c[1]])
          any = true
        }
      }
      if (any) {
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 160, left: 260, right: 320 },
          maxZoom: 6,
          duration: 900,
        })
      }
    }

    if (steeringOn && !prev.steering) fitTo(data?.schematic?.steering ?? null)
    if (uncertaintyOn && !prev.uncertainty) fitTo(data?.schematic?.uncertainty ?? null)
    prevSchematicOnRef.current = { steering: steeringOn, uncertainty: uncertaintyOn }
  }, [activeLayers, ready, data])

  /* 图层开关（data 变化时重放，保证重建后的图层可见性正确） */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    for (const { id, mapLayerIds } of LAYER_TOGGLE_MAP) {
      const visible = activeLayers.includes(id)
      for (const layerId of mapLayerIds) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
        }
      }
    }
  }, [activeLayers, ready, data])

  /* 当前台风位置标记 */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !data) return
    const p = data.track[currentPointIndex]
    if (!p) return
    const source = map.getSource(SOURCE_IDS.position) as GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {},
    })
  }, [currentPointIndex, ready, data])

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} />
      {!ready && <div className={styles.loading}>正在初始化地图…</div>}
      {basemapNotice && <div className={styles.basemapNotice}>{basemapNotice}</div>}
    </div>
  )
}
