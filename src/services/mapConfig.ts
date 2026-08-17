import type { StyleSpecification } from 'maplibre-gl'

/**
 * 地图全局配置：底图样式、初始视角、栅格瓦片地址。
 * 替换底图/云图只需修改本文件。
 */

/** 底图：CARTO Dark Matter（深色海洋底图，免费，需保留署名） */
export const MAP_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/**
 * 底图离线回退样式：仅深色背景，不含任何外部瓦片。
 * 当在线底图（CARTO）加载失败时启用，保证核心科普数据层（轨迹/登陆/卫星/SST/风险）
 * 仍能在纯色背景上正常渲染，页面不白屏。
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

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors © CARTO'

/**
 * 卫星云图（演示）：NASA GIBS 葵花八号真彩 WMTS。
 * 演示用途的固定时次瓦片；正式作品应改为业务化云图服务。
 */
export const SATELLITE_TILE_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_TrueColor/default/2025-07-22T06:00:00Z/250m/{z}/{y}/{x}.jpg'

export const SATELLITE_TILE_SIZE = 512

export const SATELLITE_ATTRIBUTION = 'NASA GIBS / JMA Himawari-8（演示瓦片）'

/** 时间轴播放到登陆事件附近（±N 小时）时，高亮对应登陆点（不改变用户时间索引、不强制跳转） */
export const LANDFALL_HIGHLIGHT_WINDOW_HOURS = 3
