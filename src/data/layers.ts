import type { LayerDef } from '../types'

/** 图层控制面板定义（与地图渲染解耦） */
export const LAYER_DEFS: LayerDef[] = [
  { id: 'track', label: '台风路径', color: '#35c8ff', hint: '轨迹线、时次点与强度' },
  { id: 'windRadii', label: '风圈', color: '#7dd8ff', hint: '七/十/十二级风圈' },
  { id: 'satellite', label: '卫星云图', color: '#e8f1f8', hint: '葵花卫星真彩（演示瓦片）' },
  { id: 'envSatellite', label: '真实卫星云图', color: '#ffffff', hint: 'FY-4B AGRI 真彩（6 个时次）' },
  { id: 'envSst', label: '海表温度 SST', color: '#ff9e5e', hint: '日分析场 · °C（2 个日期）' },
  { id: 'riskTerrain', label: '地形（低海拔分级）', color: '#fdae61', hint: 'Copernicus DEM · 0-5/5-10/10-30/>30 m' },
  { id: 'riskPopulation', label: '人口暴露', color: '#7b1fa2', hint: 'Kontur 400m · 人/km²' },
  { id: 'riskProximity', label: '路径邻近度', color: '#e53935', hint: '距真实轨迹最小距离（km）' },
  { id: 'riskAttention', label: '空间关注提示', color: '#d32f2f', hint: '科普型综合提示（非官方预警）' },
  { id: 'steeringSchematic', label: '移动机制示意', color: '#f2a33c', hint: '副高与引导气流（示意，非真实分析场）' },
  { id: 'uncertaintySchematic', label: '预测不确定性示意', color: '#ff6bd6', hint: '多条示意路径（非真实集合预报）' },
  { id: 'riskZones', label: '风险分区', color: '#f2a33c', hint: '沿海风险示意（仅 DEMO）' },
  { id: 'landfalls', label: '登陆点', color: '#e64545', hint: '台风登陆点（REAL 数据）' },
  { id: 'shelters', label: '避险点', color: '#2ee6a8', hint: '应急避难场所（仅 DEMO）' },
]
