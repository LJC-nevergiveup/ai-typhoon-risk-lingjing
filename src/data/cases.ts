import type { TyphoonCase } from '../types'

/**
 * 台风案例注册表（应用级索引）。
 * 新增真实台风：在 public/data/real/<id>/ 下按约定放入数据文件，
 * 并在此追加一条配置即可，无需修改任何组件。
 * 注意：此处只放元信息，不放任何轨迹数值。
 */
export const TYPHOON_CASES: TyphoonCase[] = [
  {
    id: 'demo-synthetic',
    kind: 'demo',
    chineseName: '合成演示台风',
    englishName: 'Synthetic Demo Storm',
    year: null,
    typhoonNumber: null,
    basin: '西北太平洋',
    startTime: null,
    endTime: null,
    description: '用于界面与流程验证的合成演示路径，不代表任何真实台风。',
    dataStatus: 'available',
    dataDir: 'demo',
    sources: [],
  },
  {
    id: 'yagi-2024',
    kind: 'real',
    chineseName: '摩羯',
    englishName: 'Yagi',
    year: 2024,
    typhoonNumber: '2411',
    basin: '西北太平洋',
    startTime: null,
    endTime: null,
    description:
      '2024 年第 11 号台风“摩羯”（Yagi）。真实观测数据待接入；接入后本案例将展示权威观测轨迹、登陆点与风圈信息。',
    dataStatus: 'awaiting-authoritative-data',
    dataDir: 'real/yagi-2024',
    sources: [],
  },
]

export function getTyphoonCase(id: string): TyphoonCase {
  return TYPHOON_CASES.find((c) => c.id === id) ?? TYPHOON_CASES[0]
}
