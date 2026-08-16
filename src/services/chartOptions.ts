import type { EChartsCoreOption } from 'echarts/core'
import type { TyphoonPoint } from '../types'
import { formatClock } from '../utils/format'

/**
 * ECharts 图表配置构建（数据可视化层，与 UI 组件解耦）。
 * 新增图表时在此添加 builder。
 */

/** 台风强度时序图：最大风速（左轴）+ 中心气压（右轴，反向） */
export function buildTrackChartOption(points: TyphoonPoint[]): EChartsCoreOption {
  return {
    backgroundColor: 'transparent',
    textStyle: { color: '#9db8cc' },
    grid: { left: 46, right: 50, top: 34, bottom: 26 },
    legend: {
      data: ['最大风速 (m/s)', '中心气压 (hPa)'],
      top: 0,
      textStyle: { color: '#9db8cc', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: points.map((p) => formatClock(p.time, 8).slice(5)),
      name: '北京时间',
      nameTextStyle: { color: '#5f7f97', fontSize: 10 },
      axisLabel: { color: '#5f7f97', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1f3b57' } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: 'm/s',
        nameTextStyle: { color: '#5f7f97', fontSize: 10 },
        axisLabel: { color: '#5f7f97', fontSize: 10 },
        splitLine: { lineStyle: { color: '#132c44' } },
      },
      {
        type: 'value',
        name: 'hPa',
        nameTextStyle: { color: '#5f7f97', fontSize: 10 },
        axisLabel: { color: '#5f7f97', fontSize: 10 },
        inverse: true,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '最大风速 (m/s)',
        type: 'line',
        data: points.map((p) => p.wind),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#35c8ff' },
        itemStyle: { color: '#35c8ff' },
      },
      {
        name: '中心气压 (hPa)',
        type: 'line',
        yAxisIndex: 1,
        data: points.map((p) => p.pressure),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#f2a33c' },
        itemStyle: { color: '#f2a33c' },
      },
    ],
  }
}
