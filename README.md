# AI 台风风险灵境 · 和 AI 一起追“风”去

面向普通公众与青少年的**交互式台风地理科普**网页作品。
“首届时空灵境：AI 地理科普行动”参赛项目。

## 技术栈

- React 19 + TypeScript
- Vite 7（`base: './'`，可部署到 GitHub Pages 子路径 / Vercel）
- MapLibre GL JS 5（地图渲染）
- ECharts 5（统计图表，按需引入 core + LineChart）
- 原生 CSS + CSS Modules（无 UI 框架）

## 快速开始

```bash
npm install        # 依赖安装（缓存已重定向到项目内 .npm-cache）
npm run dev        # 开发服务器 http://localhost:5173
npm run typecheck  # TypeScript 类型检查
npm run build      # 类型检查 + 构建（产物在 dist/）
npm run preview    # 本地预览构建产物

# 真实数据导入
npm run import:yagi                        # 台风网历史数据 → track.geojson（QA 通过才写盘）
npm run import:yagi -- --self-test         # 内置合成样本自检（不涉及真实数据）
npm run import:yagi -- --update-manifest   # QA 通过后启用 REAL 案例
npm run import:cma                         # CMA-BST 原始文件（待获取）→ track.geojson
npm run import:environment                 # FY-4B 卫星/SST 官方产品 → environment manifests
npm run import:environment -- --self-test  # 环境导入器自检
```

## 目录结构

```
├── public/
│   ├── favicon.svg
│   └── data/                    # 静态地理数据（不参与打包，运行时 fetch）
│       ├── README.md            # 数据目录约定（含真实数据接入铁律）
│       ├── demo/                # DEMO 数据（-demo 后缀 + demo:true 标记）
│       ├── raw/                 # 权威数据集原始文件（只读，不入库）
│       │   └── cma/             # CMA 最佳路径原始文件（CH2024BST.txt，待提供）
│       └── real/
│           └── yagi-2024/       # 2024 年第 11 号台风“摩羯”（Yagi）
│               ├── manifest.json      # 案例清单与数据状态（available）
│               ├── track.geojson      # 真实轨迹（台风网官方历史数据，36 时次）
│               ├── landfalls.geojson  # 两次真实登陆（业务通报证据链）
│               ├── wind-radii.geojson # 风圈（占位，awaiting-authoritative-data）
│               ├── environment/       # 环境观测资料（FY-4B 卫星/SST，待人工下载）
│               └── sources.json       # 数据来源清单（historical-track / operational-bulletin 分口径）
├── scripts/
│   ├── import-cma-best-track.ts   # CMA-BST 原始文件导入（解析/单位换算/QA/输出）
│   ├── import-nmc-track.ts        # 台风网历史数据 → track.geojson（含 QA）
│   └── import-nsmc-environment.ts # FY-4B 卫星/SST 官方产品 → environment manifests
├── docs/competition/
│   ├── ai-creation-log.md         # AI 创作记录（各轮任务/核验/问题修正）
│   └── data-provenance.md         # 数据来源追溯（全部真实数值的证据链）
├── src/
│   ├── components/              # UI 组件（每个组件一个目录 + CSS Module）
│   │   ├── Header/              # 顶部标题栏 + 案例切换 + REAL/DEMO 状态徽标
│   │   ├── ChapterNavigation/   # 六大章节导航（左侧）
│   │   ├── TyphoonMap/          # 地图容器与图层管理（含登陆点图层）
│   │   ├── LayerControl/        # 地图图层控制面板（含登陆点图例）
│   │   ├── Timeline/            # 底部时间轴（由真实 timestamp 驱动）
│   │   ├── InfoPanel/           # 右侧信息面板（要点/图表/数据来源/数据状态）
│   │   └── EChart/              # ECharts 通用封装
│   ├── data/                    # 数据层：章节、图层、案例注册表、数据 loader
│   ├── services/                # 服务层：地图配置、图层样式、图表配置
│   ├── styles/                  # 全局样式与主题变量
│   ├── types/                   # 全部数据结构的类型定义
│   ├── utils/                   # 纯函数工具（地理、格式化）
│   ├── App.tsx                  # 页面骨架与全局状态
│   └── main.tsx
├── index.html
└── vite.config.ts
```

## 已实现功能

### 第一阶段（基础骨架）

- 顶部标题、左侧六章节导航（联动信息面板与图层）、地图视觉中心
- 图层控制面板（路径/风圈/卫星云图/风险分区/避险点）
- 底部时间轴（拖拽/播放，驱动台风位置标记）
- 右侧信息面板（章节要点 + ECharts 时序图）
- 地图点要素点击弹出详情

### 第二阶段（真实台风案例机制）

- **案例系统**：`src/data/cases.ts` 注册表 + `public/data/real/<id>/` 数据包（manifest 驱动）；
  新增台风无需修改组件
- **双模式加载**：DEMO / REAL 严格物理隔离；REAL 数据状态非 `available` 时返回
  `unavailable` 并明确提示，**绝不静默回退到 DEMO**；解析错误返回明确 error
- **真实轨迹模型**：id / timestamp / longitude / latitude / centralPressure /
  maxWindSpeed / intensity / source（必填）+ grade / movementDirection /
  movementSpeed / windRadius7/10/12（可选，安全处理缺失）
- **登陆点**：独立红心符号 + 图层开关图例 + Popup 显示登陆地点/时间/强度/风速/气压/来源
- **数据来源机制**：`sources.json` + InfoPanel「数据来源」卡片，前端可见 organization /
  datasetName / url / accessDate / description / licenseOrUsageNote
- **任意时间序列**：时间轴完全由真实 timestamp 生成，不假设 6 小时步长 / 固定点数 / 固定起止
- **UI 区分**：页首案例选择器 + REAL/DEMO 状态徽标；待接入时地图上有明确提示条

### 第三阶段（环境观测资料 · 台风从哪来）

- **章节 01 三步科普**：它在哪里出现（初始时次/位置）→ 海洋提供了什么（SST，非绝对化表述）→ 卫星看到了什么（真实卫星帧）
- **真实卫星云图 / SST 图层**：FY-4B AGRI 优先；按时间轴显示最近帧，状态条明示影像时间与轨迹时次的时间差；卫星云图透明度可调；数据未接入时图层显示“真实资料待接入”，绝不冒充
- **环境观测资料卡片**：卫星/仪器/产品/日期/机构/处理步骤/链接，全部可审计
- **导入工具**：`import:environment`（人工下载官方产品后一键校验并生成 manifest）

## 数据状态

| 案例 | 类型 | 状态 |
| --- | --- | --- |
| 合成演示台风 | DEMO | available（仅用于界面验证，非真实数据） |
| 2024 年第 11 号台风“摩羯”（Yagi） | REAL | **available**（轨迹 36 时次 + 两次登陆 + FY-4B 真彩卫星云图 6 帧 + SST 2 帧 + 风险分析四图层与点击查询；风圈待接入，明确提示不伪造） |

## CMA 数据导入流程

1. 从 tcdata.typhoon.org.cn 下载「CMA 热带气旋最佳路径数据集」2024 年文件 `CH2024BST.txt`，
   放入 `public/data/raw/cma/`（只读，不入库）
2. `npm run import:cma` —— 解析 header 与记录、自动识别经纬度单位（0.1°/0.01°）、
   时间统一为 ISO 8601 UTC、输出 `real/yagi-2024/track.geojson`，并打印完整 QA 报告；
   任何异常（重复时间戳、非法坐标、缺失字段、未知强度标记）都会中止且不写盘
3. 前端验证 REAL 模式后，`npm run import:cma -- --update-manifest` 将 manifest 置为 available

## 已知注意点

- 底图与卫星云图瓦片来自境外服务（CARTO / NASA GIBS），个别网络环境下可能加载较慢；
  替换时修改 `src/services/mapConfig.ts`
- 卫星云图当前为固定时次演示瓦片，正式版本应接入业务化云图服务

## 下一步计划

1. 录入摩羯（Yagi）权威轨迹/登陆点/风圈数据（CMA-BST / IBTrACS / JMA 核对）
2. 卫星云图业务化（时间匹配的 WMS/WMTS）
3. 各章节专属图表与交互（历史路径统计、登陆强度对比等）
4. 风险分区与避险路线（后续阶段）
