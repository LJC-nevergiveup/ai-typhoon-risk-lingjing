import type { StyleSpecification } from 'maplibre-gl'

/**
 * 地图全局配置：底图（天地图）、初始视角、栅格瓦片地址。
 * 替换底图/云图只需修改本文件。
 */

/* ---------- 正式底图：国家地理信息公共服务平台“天地图”（官方服务，需 token） ---------- */

/** 天地图服务 token：从环境变量 VITE_TIANDITU_TOKEN 注入（部署时设置），缺省为空字符串 */
export const TIANDITU_TOKEN: string =
  (import.meta.env.VITE_TIANDITU_TOKEN as string | undefined)?.trim() ?? ''

/** 天地图官方署名（MapLibre attribution 控件展示；不得删除 provider 署名） */
export const TIANDITU_ATTRIBUTION = '© 国家地理信息公共服务平台 天地图（tianditu.gov.cn）'

/**
 * 底图离线回退样式：仅深色背景，不含任何外部瓦片。
 * 当未配置天地图 token 或在线底图加载失败时使用，保证核心科普数据层
 * （轨迹/登陆/卫星/SST/风险）仍能在纯色背景上正常渲染，页面不白屏。
 */
export const FALLBACK_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'fallback-background',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0b1726' },
    },
  ],
}

export const MAP_CENTER: [number, number] = [126.5, 24.5]

export const MAP_ZOOM = 4.6

export const MAP_ATTRIBUTION = TIANDITU_ATTRIBUTION

/**
 * 卫星云图（演示）：NASA GIBS 葵花八号真彩 WMTS。
 * 仅 DEMO 案例使用（正式 REAL 案例不加载，见 TyphoonMap 的 kind 守卫）。
 */
export const SATELLITE_TILE_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_TrueColor/default/2025-07-22T06:00:00Z/250m/{z}/{y}/{x}.jpg'

export const SATELLITE_TILE_SIZE = 512

export const SATELLITE_ATTRIBUTION = 'NASA GIBS / JMA Himawari-8（演示瓦片）'

/** 时间轴播放到登陆事件附近（±N 小时）时，高亮对应登陆点（不改变用户时间索引、不强制跳转） */
export const LANDFALL_HIGHLIGHT_WINDOW_HOURS = 3
