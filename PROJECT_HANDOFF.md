# PROJECT_HANDOFF.md — 新 Codex 会话的项目记忆

> 生成时间：2026-08-16（第 6 轮完成、六章节故事闭环之后）
> 生成方式：对磁盘文件逐项核对后撰写（不依赖聊天记忆）。
> 长期稳定规则见 `AGENTS.md`；本文件是当前进度、事实与决策记录。

---

# Project Objective

制作面向公众与青少年的**交互式台风地理科普网页**《AI 台风风险灵境 · 和 AI 一起追“风”去》
（“首届时空灵境：AI 地理科普行动”参赛作品）。

- 围绕六个核心问题组织完整科普故事线：
  01 台风从哪来 → 02 台风往哪去 → 03 台风在哪登陆 → 04 哪里更危险 → 05 AI能做什么 → 06 人该怎么做
- 主案例：**2024 年第 11 号台风“摩羯”（YAGI，2411）**，全部使用真实、可追溯的官方数据。
- 表达方式：地图为视觉中心（MapLibre GL）+ 信息面板 + 时间轴 + 图层控制 + 点击查询；
  所有“示意/衍生/科普分析”与“真实观测”边界必须明确标注。
- 部署目标：纯静态托管（GitHub Pages / Vercel），无后端、无账号、无 LLM API。

# Current Research Question

六章节已全部完成。当前不再有新增研究问题；正在进行**比赛提交前打磨**阶段。
短期关注点：整体体验自检、README/演示材料定稿、（可选）GitHub Pages 部署验证。
如要继续扩展数据：唯一缺失的真实数据块是**风圈（wind-radii）**，允许 sparse 观测、禁止插值。

# Repository Structure

```
D:\AI时空灵境\
├── AGENTS.md                       # 长期稳定规则（所有会话必读）
├── PROJECT_HANDOFF.md              # 本文件
├── package.json / vite.config.ts / tsconfig.json / index.html / .gitignore / .npmrc / README.md
├── docs\competition\
│   ├── ai-creation-log.md          # 六轮 AI 参与记录、人工核验、问题与修正（比赛提交材料）
│   └── data-provenance.md          # 全部真实数值的证据链与缺口清单（比赛提交材料）
├── public\
│   ├── favicon.svg
│   └── data\
│       ├── README.md               # 数据目录契约与真实数据接入铁律
│       ├── demo\                   # DEMO 数据（-demo 后缀 + demo:true），严禁与 REAL 混用
│       │   ├── typhoon-track-demo.geojson（15 点合成轨迹）
│       │   ├── risk-zones-demo.geojson / shelters-demo.geojson
│       ├── raw\                    # 原始数据（只读；大二进制不入 git，见 .gitignore）
│       │   ├── nmc\yagi-2024-view.json            # 台风网 API 原始 JSONP（轨迹源头）
│       │   ├── nsmc\*.JPG / *.NC                  # 用户人工下载的 FY-4B 真彩 6 帧 + SST NC 2 个
│       │   ├── copernicus\dem\*.tif               # GLO-30 13 瓦片
│       │   ├── kontur\*.gpkg.gz                   # Kontur 人口（WorldPop 4.6GB 受限后改用）
│       │   ├── cma\README.md / worldpop\README.md # 阻塞项与替代说明
│       └── real\yagi-2024\
│           ├── manifest.json（status=available）
│           ├── track.geojson（36 点） / landfalls.geojson（2 次登陆）
│           ├── wind-radii.geojson（占位 awaiting-authoritative-data）
│           ├── sources.json（historical-track / operational-bulletin 分口径）
│           ├── environment\satellite\（manifest + 6 PNG）
│           ├── environment\sst\（manifest + 2 PNG）
│           ├── environment\sources.json
│           ├── risk\（aoi.json / grid.json / sources.json / terrain / population /
│           │         proximity / attention 四子目录，各含 manifest+summary+png）
│           └── schematic\（steering-schematic / forecast-uncertainty-schematic，纯示意）
├── scripts\                        # 可复现数据管线（含 QA；Python 脚本用 ASCII 工作目录）
│   ├── import-nmc-track.ts         # 台风网历史数据 → track.geojson（--self-test / --update-manifest）
│   ├── import-cma-best-track.ts    # CMA-BST（文件待获取）→ track.geojson（备用交叉核验）
│   ├── import-nsmc-environment.ts  # FY-4B 人工下载 → environment manifests（frames.json 登记制）
│   ├── import_fy4b_env.py          # FY-4B 真彩 NOM→EPSG:4326 重投影（实测圆盘定标）
│   ├── import_crw_sst.py           # NOAA CRW SST CSV→色带 PNG + sst manifest
│   ├── prepare_terrain.py          # GLO-30→AOI 分级（Natural Earth 海岸线掩膜）
│   ├── prepare_population.py       # Kontur gpkg→AOI 密度网格
│   ├── compute_track_proximity.py  # 36 点轨迹最小测地距离
│   └── build_risk_awareness.py     # 确定性三因子规则→关注分级+grid.json
└── src\
    ├── App.tsx / main.tsx / App.module.css
    ├── types\index.ts              # 全部数据结构唯一权威
    ├── data\（cases.ts 案例注册 / chapters.ts 章节文案 / layers.ts 图层面板 / loaders.ts 唯一数据入口）
    ├── services\（mapConfig.ts 底图与高亮窗口 / layers.ts 图层样式与 id / chartOptions.ts ECharts 配置）
    ├── utils\（format.ts / geo.ts）
    ├── styles\（variables.css / global.css）
    └── components\
        ├── Header\（标题+案例选择+REAL/DEMO 徽标+❓引导按钮）
        ├── ChapterNavigation\（六章节+已读标记）
        ├── TyphoonMap\（地图核心：全部图层、弹窗、点击查询、AOI 边界、示意命中层）
        ├── InfoPanel\（章节要点/专题卡/图表/数据来源/数据状态/点击查询/故事线）
        ├── Timeline\（事件标记+播放+临近高亮）
        ├── LayerControl\（图层开关+卫星透明度滑杆）
        ├── EnvironmentStatus\（卫星帧/SST 时间差提示条）
        └── EChart\（ECharts 通用封装）
```

# Dataset and Splits

本项目不是 ML 项目，没有训练/验证/测试划分。“Splits”对应两种**严格隔离**的数据模式：

| 模式 | 目录 | 说明 |
| --- | --- | --- |
| DEMO | `public/data/demo/` | 合成轨迹 15 点 + 风险区/避险点示意；文件名 `-demo`、`demo:true`；仅用于界面验证 |
| REAL | `public/data/real/yagi-2024/` | 摩羯真实数据包（下述全部数据） |

REAL 数据包内容与状态（磁盘已核对）：

| 数据集 | 文件 | 状态 | 关键事实 |
| --- | --- | --- | --- |
| 轨迹 | track.geojson | available，36 点 | 来源：中国气象局台风网历史 API（id 3275487），经 import-nmc-track.ts 生成；2024-09-01T00:00Z — 09-08T12:00Z；12.2–21.9°N、103.6–126.2°E；13–62 m/s；915–1004 hPa；10 条 3h 加密；原始字段8 改名为 nmcFlagRaw（语义未经证实，禁用为登陆标志） |
| 登陆点 | landfalls.geojson | available，2 点 | 文昌 08:20Z（62/915，17级以上）+ 徐闻 14:20Z（58/925，17级）；数值出自官方通报原文（notes 内引用）；坐标为 geocoded-location（仅可视化） |
| 风圈 | wind-radii.geojson | 占位（0 features） | 缺失即缺失，禁止插值；模型支持 sparse 观测 |
| 卫星云图 | environment/satellite | available，6 帧 | FY-4B AGRI 真彩（GCLR）1000M；时刻 09-01/02/03/04 00Z、09-05 06Z、09-06 06Z；NOM(105°E)→EPSG:4326 重投影裁剪 |
| SST | environment/sst | available，2 帧 | 展示层：NOAA CRW CoralTemp 日分析（09-01、09-05，°C）；FY-4B AGRI SST 观测保留为证据（云覆盖，区域内高质量像元约 1%，均值 28.8/28.4°C） |
| 风险分析 | risk/ | available | AOI=[108.2,18.9,111.6,21.2]；0.01° 网格 340×230；DEM=Copernicus GLO-30；人口=Kontur 400m；邻近度=36 点轨迹最小测地距离；确定性规则分级 |
| 机制示意 | schematic/ | available，2 文件×3 要素 | 纯示意（schematic:true），非真实大气分析场/非真实集合预报 |

# Input Representation / Preprocessing

- 统一规范轨迹点模型 `TyphoonPoint`（id/time/lon/lat/wind/pressure/category/r7/r10/r12 + 可选
  source/grade/movementDirection/movementSpeed）；真实数据经 loader 适配为该模型，UI 不假设固定步长。
- 环境观测：`SatelliteFrame`（timestamp UTC/satellite/instrument/product/imagePath/bbox/processing/caption）、
  `SstFrame`（date/unit=°C/valueRange/legend/processing）；处理步骤逐项写入 processing。
- 卫星云图处理链：官方 JPG（NOM 标称网格，nominal subpoint 105°E）→ 圆盘边缘实测定标
  （扫描角采样 5.78″/px，与 1000M 标称一致）→ 标准静止卫星前向投影 → 双线性重采样到
  EPSG:4326 → 裁剪 105–140°E、5–30°N → PNG；地物颜色特征与台风眼定位做过定量验证。
- SST 处理链：ERDDAP 下载 CSV（数值未改）→ 本地网格化 → 蓝→红色带（值域按帧）→ 陆地/无效灰化。
- 风险处理链：DEM 用 Natural Earth 110m 海岸线掩膜区分海陆（GLO-30 沿岸瓦片含 0 值海面）；
  人口六边形质心归入 0.01° 网格求和→密度；邻近度用 WGS84 球面（R=6371.0088km）交叉航迹距离，
  逐段取最小值+端点裁剪。

# Model Architecture

**本项目没有机器学习模型、没有训练、没有权重、没有随机种子。**
此节对应的是软件与数据架构：

- 前端：React 19（函数组件+hooks）+ TypeScript strict；状态集中在 App.tsx（案例/章节/图层/
  时间索引/风险查询/AOI 信号/引导）。
- 地图：MapLibre GL JS 5，正式底图 = 天地图（国家地理信息公共服务平台，vec_w+cva_w，需
  `VITE_TIANDITU_TOKEN`；开发阶段曾用 CARTO Dark Matter，提交前已移除）；业务图层（轨迹/风圈/登陆点/环境帧/风险栅格/
  示意线/AOI 边界）全部通过 `src/services/layers.ts` 的 id 与样式集中管理，开关经
  `LAYER_TOGGLE_MAP` 与 activeLayers 状态联动。
- 图表：ECharts（core 按需引入 LineChart），封装于 components/EChart。
- 数据流：`loaders.ts` 的 `loadCase()` → 判别联合 `ready/unavailable/error` → `ActiveMapData`
  （含 track/landfalls/events/environment/risk/schematic/warnings）→ 组件只消费该结构。
- 时间联动：时间轴由真实 timestamp 驱动；卫星/SST 帧按“最近帧”选择并显示与轨迹时次的时间差；
  登陆事件 ±3h 高亮（`LANDFALL_HIGHLIGHT_WINDOW_HOURS=3`）。
- 风险关注规则（确定性，可审计）：
  terrainHigh=陆地且高程≤5m；popHigh=密度≥2000 人/km²；proxHigh=距路径≤50km；
  highCount≥2→重点关注；highCount==1 或 medCount≥2→较高关注；其余→一般关注（海域不计地形与人口）。

# Frozen Experimental Protocol

没有“实验协议”，但以下为**冻结的数据/科学协议**（详见 AGENTS.md，此处列要点）：

1. 数值零编造；REAL/DEMO 物理隔离；REAL 缺失不静默回退。
2. 所有真实数值可追溯（机构/产品/UTC 时间/URL/处理说明）。
3. 示意≠真实：机制示意、预测不确定性、空间关注提示三类必须各自标注。
4. 缺失即缺失（风圈占位）；不绕过登录/WAF；来源变更必须记录。
5. 确定性规则不调权重；QA 失败不写盘。

# Completed Experiments

按轮次（每轮均已 typecheck/build/dev 验证）：

1. **Round 1**：Vite+React+TS 工程初始化、六章节导航、地图容器、时间轴、图层面板、DEMO 数据。
2. **Round 2**：REAL/DEMO 案例系统、manifest 机制、loader 判别联合、登陆点模型、数据来源机制。
3. **Round 2.5**：YAGI 真实轨迹接入（台风网官方 API，36 点，QA 全项通过）。
4. **Round 3**：两次真实登陆（业务通报证据链，四个数值全部官方原文核验，null=0）；nmcLandfallFlag 审计→nmcFlagRaw；事件时间轴与临近高亮；资料口径说明。
5. **Round 4**：FY-4B 真彩 6 帧（重投影+几何验证）；SST 展示层（FY-4B 观测证据 + NOAA CRW 分析场）；章节 01 三步科普；环境观测状态条。
6. **Round 5**：风险分析（DEM/人口/邻近度三因子 + 确定性关注分级 + 点击查询 + AOI 边界）。
7. **Round 6**：02 机制科普与示意图层、05 AI 工作流与“不可直接相信”案例、06 四情境+应急包+预警科普；首次引导、章节过渡故事线、已读标记。
8. **Round 6.5**：提交前溯源与文档一致性清理（WorldPop→Kontur 口径、sources.json 包装、cases.ts 状态、README/日志、风险管线重跑字节级一致）。
9. **Round 7**：投稿前总审计与打包（默认 REAL 案例、底图失败降级、dist 剔除原始大文件 598MB→16.6MB、地图合规/网络/性能/科学性四份审计、DEPLOYMENT/BLOCKERS、submission/ 目录）。

# Key Numerical Results

（全部来自磁盘文件，非记忆）

| 项目 | 数值 | 出处文件 |
| --- | --- | --- |
| 轨迹 | 36 点；峰值 62 m/s / 915 hPa @2024-09-05T00:00Z；13–62 m/s；915–1004 hPa | track.geojson |
| 登陆1 | 2024-09-06T08:20:00Z 文昌翁田镇沿海 62 m/s / 915 hPa（17级以上） | landfalls.geojson |
| 登陆2 | 2024-09-06T14:20:00Z 徐闻角尾乡沿海 58 m/s / 925 hPa（17级） | landfalls.geojson |
| 卫星 | 6 帧（09-01~09-06）；重投影定标 5.78″/px；眼区距轨迹点 ≤0.5° | environment/satellite |
| SST | 09-01：25.5–31.9°C（均值 30.2）；09-05：25.6–32.4°C（均值 30.0） | environment/sst |
| 风险 | AOI 340×230 格；人口 1052.7 万；密度峰值 60,899 人/km²；距离 0–162km；重点关注 1,562 / 较高 36,762 / 一般 39,876 格 | risk/*-summary.json |
| 点击查询样例 | 海口(110.32,20.03)：海拔 7.5m、2302 人/km²、距路径 4.16km → 重点关注 | risk/grid.json 模拟验证 |

# Failed / Rejected Directions

（均为真实记录，见 docs/competition/ai-creation-log.md）

- **tcdata.typhoon.org.cn（CMA-BST）程序化下载**：SafeLine WAF（HTTP 468 JS 挑战）→ 不绕过，改用台风网官方 API，来源变更已记录。
- **NASA GIBS 葵花档案（2024-09）**：真彩图层已下架、红外/可见光图层 2024-09 返回 404（仅近期数据）→ 弃用。
- **NMC 台风网自身云图接口**：历史时次图片 404 → 弃用。
- **RAMMB Slider 历史瓦片**：路径格式无法探通 → 弃用。
- **WorldPop 中国 100m**：完整文件 4.6GB，下载受限 → 报告阻塞项，改用 Kontur 400m（HDX 公开）。
- **FY-4B AGRI SST 作为 SST 展示层**：区域内高质量像元仅约 1%（台风云覆盖）→ 拒绝插值，保留为观测证据，展示层用 NOAA CRW 分析场。
- **把 nmcLandfallFlag 当登陆标记**：语义无法证实 → 拒绝，改名 nmcFlagRaw。
- **伪造/插值风圈**：拒绝，保持占位（缺失即缺失）。
- **把风险提示做成“官方风险指数”**：拒绝，改为因子式解释 + 确定性规则 + science-communication-only 标记。

# Current Selected Method

- 展示：单页应用 + 六章节导航 + 地图中心（无多页面拆分）。
- 数据：真实数据全部“先取官方源→脚本处理→QA→manifest→前端消费”，处理步骤可追溯。
- 科普表达：真实观测与示意/衍生严格分层标注；每章四步/卡片式交互；点击查询给因子级解释而非单一指数。

# Important Files and Paths

- 核心入口：`src/App.tsx`、`src/components/TyphoonMap/TyphoonMap.tsx`、`src/components/InfoPanel/InfoPanel.tsx`
- 数据权威：`src/types/index.ts`、`src/data/loaders.ts`
- 图层与底图：`src/services/layers.ts`、`src/services/mapConfig.ts`、`src/data/layers.ts`
- 章节文案：`src/data/chapters.ts`（含 nextHint 过渡语与 STORY_ENDING）
- 案例注册：`src/data/cases.ts`（demo-synthetic / yagi-2024）
- 数据包：`public/data/real/yagi-2024/`（见 Repository Structure）
- 比赛材料：`docs/competition/ai-creation-log.md`、`docs/competition/data-provenance.md`
- 数据管线：`scripts/`（8 个，见 Repository Structure）
- 注意：项目根目录还有用户下载的 `卫星云图.zip` 与 `卫星云图\` 解压目录（与 raw/nsmc 重复，仅备份用，已 gitignore，不要删除）。

# Current Code State

- `npm run typecheck`：通过（0 错误）。
- `npm run build`：通过（611 模块；vendor 分包 maplibre/echarts/react；仅有 chunk>500kB 的提示性警告）。
- `npm run dev`：5173 端口有后台开发服务器运行（当前会话启动；换会话后若未运行需自行启动）。
- 最近修改（Round 6 + 后续修复）：chapters.ts（nextHint/默认图层）、TyphoonMap（示意层/AOI 边界/命中层/点击查询）、
  InfoPanel（02/05/06 卡片、故事线、点击查询、AOI 提示）、Header（❓引导按钮）、App（visited/引导/onNextChapter/showRiskAoi）、
  ChapterNavigation（已读标记）、services/layers.ts（示意/AOI/命中层）、types/index.ts（SchematicData 等）、
  schematic/ 两个示意 GeoJSON（新）。
- 前端未解决但已绕过的问题：HMR 不重挂载一次性 effect → 已把风险点击查询改为可重挂载 effect，
  并在用户反馈“没反应”时重启 dev server + Ctrl+F5 解决。

# Reproducibility Information

- 环境：Windows；Node v24.14.1；npm 11.11.0；Python 3.12.4（Anaconda），
  已装 numpy/Pillow/scipy/rasterio 1.3.11/pyproj/geopandas/netCDF4 1.7.4（清华 pip 镜像）。
- 命令：`npm install`（缓存已重定向到项目内 .npm-cache）→ `npm run dev` / `npm run typecheck` / `npm run build`。
- 数据导入：`npm run import:yagi [-- --self-test] [-- --update-manifest]`；
  `npm run import:environment [-- --self-test]`；`npm run import:cma`（待文件）；
  Python 管线脚本需设 `$env:RISK_WORK`/`$env:FY4B_WORK` 指向 ASCII 临时目录。
- 随机种子：不适用（无 ML/随机过程）。
- 关键环境坑：中文路径在 Python/C 库下的乱码形态（见 AGENTS.md 第 5 节，必须遵守）。

# Scientific Constraints

见 AGENTS.md 第 2 节（数据铁律，最高优先级）与本文档 Frozen Experimental Protocol。
特别强调：风圈缺失不补造；机制示意/预测不确定性/空间提示三类边界声明不得删除；
“AI 负责辅助，最终科学事实由人工核验和权威资料确认”的表述不得弱化。

# Known Issues

- 风圈缺失（wind-radii 占位）。
- CMA-BST 文件未获取（tcdata WAF）。
- 登陆点坐标为地理编码（非官方精确坐标）。
- 卫星云图为 6 个代表时刻（非业务化连续云图）。
- SST 展示层与 FY-4B 观测来源不同（已在 sources/manifest 记录）。
- HMR 陈旧会话问题（解决方式：重启 dev server + Ctrl+F5）。
- 构建产物存在 chunk>500kB 提示（maplibre 本体约 1MB，可接受）。
- **P0（人工项）：地图底图合规最终人工检查**（底图已换天地图官方服务；未取得正式证明前不宣称“已通过审核”；
  见 docs/competition/map-compliance-audit.md）；天地图 token、≥2 张真实截图、正式 URL、作者信息待人工补录。
- 作者信息已回填（李金澄，中国地震局兰州地震研究所，个人参赛）；正式 URL 待部署后回填（website-link.txt）。

# Pending Tasks

1. 风圈稀疏观测接入（若有权威数据）。
2. CMA-BST 交叉核验（若有文件）。
3. 登陆点官方精确坐标（若有）。
4. 比赛提交打磨：README 定稿、页面 meta/描述、演示流程脚本、（可选）GitHub Pages 部署验证。
5. 若评委要求：补充人工演示录屏与答辩材料。

# Recommended Next Step

进入“比赛提交打磨”：
1. 浏览器全流程自检（六章节 + 引导卡 + 点击查询 + 时间轴播放 + DEMO 回归）。
2. 更新 README（当前版本描述、截图占位、部署步骤）。
3. （可选）`git init` 后的首个提交已完成，后续按功能提交；部署到 GitHub Pages 前运行
   `npm run build`，产物 `dist/` 上传或配置 Actions。
4. 不要开始新数据集/新功能，除非用户明确要求。

# Do Not Repeat / Do Not Change

- **不要重复**：数据下载类实验（tcdata/GIBS/RAMMB/WorldPop 的失败路径均已探明并记录）——
  不要重新探测同样来源，除非用户明确要求。
- **不要修改**：landfalls/track/environment/risk 各 manifest 中的数值与 processing 记录；
  风圈占位状态；DEMO 数据文件；AGENTS.md 的规则；vite `base:'./'`；`.npmrc` 缓存重定向。
- **不要删除**：`docs/competition/` 两份材料；`public/data/raw/` 任何文件；
  项目根目录的 `卫星云图.zip` 与 `卫星云图\`（用户备份）。
- **不要运行**：`import:cma`（文件缺失，会正确报错，属预期）、任何会写盘的数据脚本
  除非在 ASCII 工作目录且 QA 先行。

# Handoff Notes for the Next Codex Session

- 本机项目根：`D:\AI时空灵境`（注意 AGENTS.md 第 5 节的路径坑）。
- 开发服务器：当前会话在后台运行 `npm run dev`（5173）。新会话若端口占用/未运行，
  先 `Get-NetTCPConnection -LocalPort 5173` 检查；重启前先杀掉旧进程。
- 用户操作习惯：会实际打开浏览器验证；反馈“没反应”时先让其 Ctrl+F5 并重启 dev server，
  同时检查是否选中了「摩羯」REAL 案例（DEMO 案例没有 REAL 数据功能）。
- 所有“为什么这样做”的决策背景在 `docs/competition/ai-creation-log.md`；数值证据链在
  `docs/competition/data-provenance.md`。修改任何数据/文案前先读这两份文件。
- 若用户要求继续新功能，按 AGENTS.md 的约束先确认其不违反数据铁律，再动手。

---

## Git 信息（本文件生成时）

- Branch：`master`；提交链：`5b99585 Initial commit` → `c03b497 docs: update handoff` →
  `870f8bb fix: align provenance and release documentation`（Round 6.5）。
- 标签：`release-r6.5`（指向 870f8bb 的 release checkpoint）。
- Round 7 的代码与文档改动在本次会话末尾统一提交；不 push、不建远程仓库。
