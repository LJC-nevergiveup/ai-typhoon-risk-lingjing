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
    startTime: '2024-09-01T00:00:00Z',
    endTime: '2024-09-08T12:00:00Z',
    description:
      '2024 年第 11 号台风“摩羯”（Yagi）。已接入台风网官方历史轨迹、中央气象台业务通报的两次登陆、环境观测资料与科普型空间关注提示；风圈数据待接入（未伪造、未插值）。',
    dataStatus: 'available',
    dataDir: 'real/yagi-2024',
    sources: [],
  },
]

export function getTyphoonCase(id: string): TyphoonCase {
  return TYPHOON_CASES.find((c) => c.id === id) ?? TYPHOON_CASES[0]
}
