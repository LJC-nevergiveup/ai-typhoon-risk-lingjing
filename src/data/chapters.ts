import type { Chapter, ChapterId } from '../types'

/**
 * 六大核心章节静态配置（科普文案）。
 * 与地图数据解耦：章节内容不依赖数据加载。
 * nextHint：章节之间的故事过渡（显示在信息面板底部）。
 */
export const CHAPTERS: Chapter[] = [
  {
    id: 'origin',
    index: '01',
    question: '台风从哪里来？',
    title: '台风从哪来',
    subtitle: '生成海域 · 海温条件 · 水汽来源 · 地转偏向力',
    keyPoints: [
      '生成海域：绝大多数台风诞生于西北太平洋与南海的热带洋面',
      '海温条件：海表温度通常需高于 26.5℃，为台风持续供给能量',
      '水汽来源：高温海水蒸发产生大量水汽，凝结释放潜热驱动上升气流',
      '地转偏向力：科里奥利力让气流旋转成涡，赤道附近反而难以生成',
    ],
    defaultLayers: ['track'],
    nextHint: '台风已经形成，它接下来会往哪里去？',
  },
  {
    id: 'track',
    index: '02',
    question: '台风会往哪里去？',
    title: '台风往哪去',
    subtitle: '历史路径 · 路径预测 · 转向机制 · 副热带高压 · 集合预报',
    keyPoints: [
      '历史路径：历年台风路径记录了“往哪去”的统计规律',
      '路径预测：气象部门滚动发布 24 / 48 / 72 小时路径预报',
      '转向机制：台风常沿副热带高压西侧引导气流移动，并在高压西缘转向',
      '副热带高压：西北太平洋副高是决定台风走向的“方向盘”',
      '集合预报：多模式集合用“概率面条图”表达路径不确定性',
    ],
    defaultLayers: ['track'],
    nextHint: '路径逐渐逼近陆地，它会在哪里登陆？',
  },
  {
    id: 'landfall',
    index: '03',
    question: '台风会在哪里登陆？',
    title: '台风在哪登陆',
    subtitle: '登陆点 · 登陆时间 · 台风强度 · 风圈 · 风雨影响 · 沿海风险',
    keyPoints: [
      '登陆点：路径与海岸线的交点，决定受灾的第一现场',
      '登陆时间：与天文潮叠加时，风暴增水危害更大',
      '台风强度：登陆时中心风速与气压决定破坏力',
      '风圈：七级 / 十级 / 十二级风圈刻画大风影响范围',
      '风雨影响：强风、暴雨、风暴潮三者常同时出现',
      '沿海风险：沿海地区直面登陆台风的第一波冲击',
    ],
    defaultLayers: ['track', 'landfalls'],
    nextHint: '登陆并不意味着所有地方面临同样风险。',
  },
  {
    id: 'risk',
    index: '04',
    question: '哪些地方更危险？',
    title: '哪里更危险',
    subtitle: '低洼城区 · 山洪沟谷 · 沿海岸段 · 人口密集区 · 综合风险分区',
    keyPoints: [
      '低洼城区：内涝积水威胁地下空间与地面交通',
      '山洪沟谷：强降水易引发山洪与地质灾害',
      '沿海岸段：风暴潮与巨浪冲击海堤与海滨设施',
      '人口密集区：人口与经济密度放大灾害损失',
      '综合风险分区：叠加多因子划出高 / 中 / 低风险区',
    ],
    defaultLayers: ['track', 'landfalls'],
    nextHint: '这么多地理信息，AI 能帮我们做什么？',
  },
  {
    id: 'ai',
    index: '05',
    question: 'AI 能帮我们做什么？',
    title: 'AI能做什么',
    subtitle: '多源数据整理 · 数据处理代码 · 交互地图 · 科普表达 · 人工核验',
    keyPoints: [
      'AI 辅助整理多源数据：把不同格式、不同口径的资料整理成统一结构',
      'AI 辅助生成数据处理与可视化代码：重投影、分级、色带与图表',
      'AI 辅助构建交互式地图：图层、时间轴与点击查询',
      'AI 辅助科普表达：把专业内容转成公众能读懂的语言',
      '但 AI 的输出必须经过人工核验，科学事实以权威资料为准',
    ],
    defaultLayers: ['track'],
    nextHint: '技术最终要服务于人的安全。',
  },
  {
    id: 'action',
    index: '06',
    question: '我们应该怎么做？',
    title: '人该怎么做',
    subtitle: '看懂预警 · 提前转移 · 远离危险区 · 应急物资准备',
    keyPoints: [
      '看懂预警：读懂蓝 / 黄 / 橙 / 红四级预警信号',
      '提前转移：听从政府指令，在风雨来临前转移',
      '远离危险区：避开低洼、山洪沟谷与海岸危险区',
      '应急物资：备足饮用水、食品、药品、照明与充电设备',
    ],
    defaultLayers: ['track'],
  },
]

export const CHAPTER_ORDER: ChapterId[] = CHAPTERS.map((c) => c.id)

export function getChapter(id: ChapterId): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0]
}

/** 故事收尾语（第六章之后） */
export const STORY_ENDING =
  '六个问题走完，一场真实台风的旅程就到这里。防灾避险，请以官方预警为准。'
