# AI 台风风险灵境 · 和 AI 一起追“风”去

面向普通公众与青少年的**交互式台风地理科普**网页作品。
“首届时空灵境：AI 地理科普行动”参赛项目。

主案例为 **2024 年第 11 号台风“摩羯”（Yagi，2411）**：真实轨迹、两次登陆、环境观测与
科普型空间关注提示，全部来自可追溯的公开数据（见 `docs/competition/data-provenance.md`）。

## 技术栈

- React 19 + TypeScript（strict）
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

# 真实数据导入（QA 全部通过才写盘；Python 管线见 scripts/）
npm run import:yagi            # 台风网历史数据 → track.geojson
npm run import:environment     # FY-4B 卫星/SST 官方产品 → environment manifests
python scripts/prepare_terrain.py        # Copernicus GLO-30 → 地形分级
python scripts/prepare_population.py     # Kontur 人口 → 人口暴露
python scripts/compute_track_proximity.py # NMC 轨迹 → 路径邻近度
python scripts/build_risk_awareness.py    # 三因子确定性规则 → 空间关注提示
```

## 六大章节

| # | 章节 | 一句话 |
| --- | --- | --- |
| 01 | 台风从哪来 | 生成海域 · 海温条件 · 水汽来源 · 地转偏向力 |
| 02 | 台风往哪去 | 历史路径 · 引导气流 · 副热带高压 · 集合预报（示意） |
| 03 | 台风在哪登陆 | 登陆点 · 强度 · 风圈 · 风雨影响 |
| 04 | 哪里更危险 | 低洼 / 山洪 / 海岸 / 人口密集 · 空间关注提示 + 点击查询 |
| 05 | AI能做什么 | 数据整理 · 处理代码 · 交互地图 · 科普表达 · 人工核验 |
| 06 | 人该怎么做 | 看懂预警 · 提前转移 · 远离危险区 · 应急物资 |

## 科学口径（重要）

- **无机器学习模型**：本作品不包含任何模型训练、权重、随机种子，也不存在
  训练 / 验证 / 测试集划分。“AI”在本作品中的角色是**数据处理、代码编写、质量核验与
  叙事表达辅助**，不替代任何预报结论；所有科学事实以权威资料为准并经过人工核验。
- **风圈数据待接入**：`wind-radii.geojson` 缺少完整权威数据，作品**未伪造、未插值**，
  保持 `awaiting-authoritative-data` 占位并在界面上明确提示。
- **数据来源分口径**（详见各 `sources.json`）：
  - 官方 / 业务：中国气象局台风网历史轨迹、中央气象台登陆业务通报；
  - 权威公开：FY-4B AGRI 真彩 / SST（国家卫星气象中心）、NOAA Coral Reef Watch SST、
    Copernicus GLO-30；
  - 第三方公开：Kontur Population 400m H3（HDX，CC BY）；
  - 衍生分析：台风路径邻近度、科普型空间关注提示（确定性、可审计规则，
    `purpose=science-communication-only`，**不属于官方灾害风险预报**）。
- 机制示意与预测路径示意均标注“示意、非真实”，绝不冒充真实大气分析场或集合预报。

## 目录结构（精简）

```
public/data/
├── demo/                     # 合成演示（-demo 后缀 + demo:true，严格隔离）
├── raw/                      # 原始权威数据（只读，二进制不入库）
└── real/yagi-2024/           # 摩羯（Yagi）真实数据包
    ├── track.geojson         # 台风网官方历史轨迹（36 时次）
    ├── landfalls.geojson     # 中央气象台业务通报（2 次登陆）
    ├── wind-radii.geojson    # 风圈（占位，未伪造）
    ├── environment/          # FY-4B 卫星云图（6 帧）+ NOAA CRW SST（2 帧）
    ├── risk/                 # terrain/population/proximity/attention + grid + sources + aoi
    ├── schematic/            # 引导气流 / 预测不确定性示意（schematic:true）
    └── sources.json
src/
├── components/               # Header / ChapterNavigation / TyphoonMap / LayerControl /
│                             #   Timeline / InfoPanel / EChart
├── data/                     # cases / chapters / layers 注册表 + loaders
├── services/                 # 地图配置、图层样式、图表配置
├── types/                    # 全部数据结构类型（唯一权威）
└── utils/                    # 纯函数工具（地理、格式化）
scripts/                      # 数据导入与空间分析（可复现，含 QA 自检）
docs/competition/             # AI 创作记录 + 数据来源追溯（比赛材料）
```

## 数据状态

| 案例 | 类型 | 状态 |
| --- | --- | --- |
| 合成演示台风 | DEMO | available（仅界面验证，非真实数据） |
| 2024 年第 11 号台风“摩羯”（Yagi） | REAL | **available**（轨迹 36 时次 + 两次登陆 + 卫星云图 6 帧 + SST 2 帧 + 风险四图层与点击查询；风圈待接入，明确提示不伪造） |

## 已知注意点

- 底图与卫星云图瓦片来自境外服务（CARTO / NASA GIBS），个别网络环境可能加载较慢。
- 卫星云图采用人工下载的 FY-4B 官方产品，经标称网格重投影与区域裁剪，处理步骤见各帧
  `processing`；处理后的图像不称为“原始卫星数据”。
- 开发时若改动数据后界面“没反应”，多为 HMR 陈旧会话：重启 `npm run dev` 并 Ctrl+F5。
