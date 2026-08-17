# AI 创作记录（AI Creation Log）

> 作品：AI 台风风险灵境 · 和 AI 一起追“风”去
> 参赛：首届时空灵境 · AI 地理科普行动
> 记录原则：如实记录每轮 AI 参与环节、人工核验、发现的问题与修正方式；保留各轮原始任务要求（Prompt 关键内容摘录）。

---

## Round 1 · 工程初始化与基础 UI

**Prompt 关键内容（摘录）**：从零初始化 Vite + React + TypeScript 项目；安装 MapLibre GL JS 与 ECharts；顶部标题“AI 台风风险灵境/和 AI 一起追‘风’去”；六章节导航（不做六个独立网页）；右侧信息面板；底部时间轴占位；图层控制面板占位（台风路径/风圈/卫星云图/风险分区/避险点）；深蓝/海洋蓝/白色视觉；PC 优先（1366×768 与 1920×1080）；数据与 UI 分离；预留 public/data/；DEMO 数据必须与真实数据严格分离并明确标记；每步验证 npm install / tsc / build / dev。

**AI 参与环节**：
- 初始化项目骨架（手动搭建配置文件与目录结构，未使用脚手架模板）
- 编写全部组件（Header / ChapterNavigation / TyphoonMap / InfoPanel / Timeline / LayerControl / EChart）
- 建立 types / data / services / utils 分层，创建 3 个 `-demo` 后缀的演示数据文件（内部 `demo: true` 标记）

**人工核验**：npm install（98 包）、`npm run typecheck`、`npm run build`、`npm run dev`（页面/入口/演示数据 HTTP 200）。

**发现的问题与修正**：
1. `npm create vite` 因沙箱无法写全局 npm 缓存而失败 → 手动搭建工程 + `.npmrc` 将缓存重定向到项目内 `.npm-cache`。
2. maplibre 类型报错（`AddSourceObject` 不存在、`demo` foreign member 等）→ 改用 `SourceSpecification`、自定义 `DemoFeatureCollection` 类型。
3. 构建 chunk 过大 → `manualChunks` 拆分 maplibre / echarts / react。

**验证结果**：typecheck 0 错误；build 成功；dev 正常。

---

## Round 2 · REAL/DEMO 案例系统

**Prompt 关键内容（摘录）**：建立 `public/data/real/yagi-2024/` 与 manifest/track/landfalls/wind-radii/sources 五个文件；没有权威真实原始数据时不允许编造“摩羯”数值，placeholder 必须标记 `status: awaiting-authoritative-data`；统一真实台风数据模型（id/timestamp/longitude/latitude/centralPressure/maxWindSpeed/intensity/source + 可选字段）；建立 TyphoonCase/manifest 机制，不把摩羯硬编码进组件；loaders 支持 DEMO/REAL/按案例加载、失败给出明确错误、REAL 失败不允许静默回退 DEMO；地图与时间轴支持任意轨迹长度与不等时间间隔；登陆点类型；数据来源机制（organization/datasetName/url/accessDate/description/licenseOrUsageNote）；UI 仅增加案例名称/年份/编号/状态/来源入口/登陆点图例。

**AI 参与环节**：建立案例注册表 `cases.ts`、重构 `loaders.ts`（判别联合 `ready/unavailable/error`）、真实轨迹模型与解析校验、登陆点图层与 Popup、时间轴由 timestamp 驱动、Header 案例选择器与 REAL/DEMO 徽标、sources.json 机制。

**人工核验**：typecheck / build / dev；端点检查确认 REAL 占位 `awaiting-authoritative-data` 且前端不会假装成功。

**发现的问题与修正**：写入 TyphoonMap 时曾混入草稿笔记导致语法错误 → 全文重写修复。

**验证结果**：全部通过；DEMO 与 REAL 物理隔离。

---

## Round 2.5 · CMA 2024 最佳路径导入（YAGI 真实轨迹）

**Prompt 关键内容（摘录）**：检查 `public/data/raw/cma/CH2024BST.txt`；若不存在：不要伪造、不要从第三方数据源替代、明确报告 missing source file 并停止真实数据生成步骤；建立导入脚本（不依赖行号、不假设固定 6 小时间隔、单位正确转换、输出 track.geojson）；保留原始字段（cmaGrade/cmaLatitudeRaw/…/cmaRecord）与 provenance；时间统一 ISO 8601 UTC，UI 另显北京时间；QA 摘要 12 项；异常不静默修复；REAL 启用条件七条；sources.json 中 CMA-BST=primary、IBTrACS/JMA=cross-validation。

**AI 参与环节**：
- 检查发现原始文件缺失 → 按指令停止数据生成，先交付 `scripts/import-cma-best-track.ts`（含 `--self-test` 与 QA 全项）。
- 用户选择“方案 B”后：tcdata.typhoon.org.cn 被 SafeLine WAF（JS 挑战，HTTP 468）拦截，**未尝试绕过**；改从同机构官方渠道——中国气象局台风网 API（typhoon.nmc.cn，台风 id 3275487）获取 YAGI 历史路径原始 JSON，保存为 `raw/nmc/yagi-2024-view.json`（只读）。
- 编写 `scripts/import-nmc-track.ts`：解析 JSONP、等级映射、时间戳往返校验、epoch 与时间串交叉校验、QA、`--update-manifest`。
- 生成 `track.geojson`（36 个真实时次）。

**人工核验**：
- QA：36 点、2024-09-01T00:00Z—09-08T12:00Z、12.2–21.9°N、103.6–126.2°E、13–62 m/s、915–1004 hPa、0 缺失、10 条 3 小时加密、epoch 一致性 0 异常。
- 公开资料交叉核验：峰值 62 m/s / 915 hPa 与官方发布一致（17级以上超强台风登陆文昌）。

**发现的问题与修正**：
1. tcdata 官方站 WAF 无法程序化下载 → 不绕过，改用台风网官方 API，并在数据 provenance 与 sources.json 中如实记录来源差异。
2. 自检中 epoch 校验正则漏删冒号导致误报 → 修正 `/[-T:]/g`。
3. 真实数据“轨迹就绪、登陆点/风圈占位”的部分就绪状态 → loader 增加 warnings 机制并如实提示。

**验证结果**：typecheck/build/dev 通过；REAL 案例点亮（manifest=available）；36 点数据零人工修改。

---

## Round 3 · YAGI 真实登陆过程与证据链

**Prompt 关键内容（摘录）**：审计 nmcLandfallFlag（来自哪里/是否真实存在/不允许把预留字段描述成“NMC官方登陆标记”）；建立两次真实登陆（文昌/徐闻）；LandfallPoint 扩展字段；坐标不能凭感觉填写，允许 geocoded-location/approximate-for-visualization 并写明用途；SourceType 区分 historical-track 与 operational-bulletin；登陆 Popup/登陆过程/时间轴事件标记（不改变用户时间索引）；通用 TyphoonEvent；风圈继续缺失；资料口径说明文案；全部数值有来源、可追溯、不手工修改；AI 创作记录与数据来源追溯文档。

**AI 参与环节**：
- 审计：原始 JSON 字段 8 全为 `"no"`（36/36），语义无法证实（BEBINCA 对照实验被 NMC 502 阻断）→ 按最保守口径改名 `nmcFlagRaw` 并注明“官方语义未经证实”，重生成 track.geojson（数值零改动）。
- 登陆数据调研：多轮官方媒体检索 + 页面抓取（初期多为 JS 壳页/502）；后台子代理完成多源核验；网络恢复后第一手抓取央广网两个频道原文逐字确认四个数值。
- 数据文件：`landfalls.geojson` 两次登陆完整证据链（62/915、58/925；coordinateType=geocoded-location，坐标取自维基百科行政区划坐标，注明仅可视化）。
- 代码：LandfallPoint/TyphoonEvent/SourceType 扩展、loader 校验、登陆 Popup、登陆过程卡片、资料口径说明、时间轴 ▲ 标记与 ±3h 临近高亮（地图同步高亮、不跳转）。

**人工核验**：央广网原文逐字比对（“17级以上（62米/秒），915hPa” / “17级（58米/秒），925百帕”）；JSON 合法性；typecheck/build/dev；DEMO 回归。

**发现的问题与修正**：
1. 国内站点初期不可达（502/000/JS 壳页）→ 不放弃也不编造：先诚实留 null，网络恢复后第一手核验再写入。
2. 徐闻数值最初未获权威确认 → 保持 null 并注明“未编造”，待核验确认 58/925 后写入并保留原文出处。

**验证结果**：全部通过；null 字段数 0；证据链完整可点击审计。

---

## Round 4 · 「台风从哪来」真实卫星云图、SST 与形成机制

**Prompt 关键内容（摘录）**：禁止编造卫星影像/AI 生成图冒充/SST 编造/绝对化表述；建立 environment/satellite|sst 目录与 SatelliteFrame/SSTFrame 模型（timestamp UTC、processing 必须记录、不得把处理后图像描述为原始数据）；优先国家卫星气象中心 FY-4B AGRI 图像与 SST；如官方站点需登录/验证码/人工下载则**不绕过**，只建 schema/importer 并明确告知人工下载清单；严禁自动改用未知第三方数据而不报告；4–6 个代表时刻（以实际获取为准，不凑数）；章节 01 三步科普（初始位置/SST/卫星）；图层控制加真实卫星云图与 SST（unavailable 时显示“真实资料待接入”，绝不 DEMO 冒充）；时间联动显示最近有效帧并明示时间差；透明度可调、SST 独立色带图例；InfoPanel“环境观测资料”；docs/competition 两份记录。

**AI 参与环节**：
- 探测官方渠道：satellite.nsmc.org.cn / data.nsmc.org.cn（DataPortal 需登录，确认含登录表单）、fy4.nsmc.org.cn、www.nsmc.org.cn → 结论：档案产品需人工登录下载，**未绕过、未改用第三方**。
- 建立 environment 数据包骨架（占位 manifest + sources.json + imagery 目录说明 + raw/nsmc/README.md 人工下载清单）。
- 类型与加载层：SatelliteFrame / SstFrame / EnvironmentData；loaders 加载环境 manifest（未就绪→warnings）。
- 地图与 UI：真实卫星帧/SST 单帧图像图层、透明度、时间轴最近帧选择、EnvironmentStatus 状态条、章节 01 三步科普卡、环境观测资料卡、LayerControl 两图层（待接入禁用）。
- **（用户下载风云数据后）**：编写 `scripts/import_fy4b_env.py`——圆盘边缘实测定标（扫描角 5.78″/px，与 1000M 标称一致）+ 标准静止卫星前向投影，把 6 帧 FY-4B AGRI 真彩（GCLR）重投影到 EPSG:4326 并裁剪 105–140°E/5–30°N；地物颜色特征与台风眼定位双项定量验证几何正确。
- FY-4B AGRI SST（用户下载的 NetCDF）经解析：该时次区域内高质量像元仅约 1%（台风云覆盖），如实保留为观测证据；SST 展示图层改用 NOAA Coral Reef Watch 官方日分析场（`scripts/import_crw_sst.py`：ERDDAP 下载 CSV、本地色带渲染、数值未修改），来源差异在 sources.json / manifest note 中如实记录。

**人工核验**：
- 用户人工下载 FY-4B 真彩 6 帧 + SST 2 日（风云数据服务网，登录下载）。
- 几何验证：海南岛陆地暖色 / 台湾海峡深蓝（方向正确）；09-05/09-06 台风眼区距轨迹点 ≤0.5°（中心与比例正确）。
- SST 交叉：FY-4B 稀疏有效像元均值 28.8/28.4°C 与 CRW 分析场（~30°C）量级一致。
- typecheck / build / dev；环境 manifest 端点验证（6 卫星帧 + 2 SST 帧，图像 HTTP 200）。

**发现的问题与修正**：
1. 官方站点登录墙 → 先建 schema/importer/占位；用户人工下载后接入，未绕过登录。
2. 中文路径在 Python/netCDF4 C 库下不可解析（磁盘目录名为历史编码）→ ASCII 临时目录处理 + 扫描定位项目根目录。
3. 4KM 网格角采样误用“除 4”（应为“乘 4”）→ 采样全落盘外；修正后通过检查点。
4. 东西向符号反了 → 用 SST 分布 + GCLR 地物特征定量判定“东→左”。
5. GCLR 尺寸非标称正方形（10992×11912）→ 用圆盘边缘实测中心与半径，弃用固定中心假设。
6. FY-4B SST 区域内 99% 云覆盖 → 不插值、不冒充，展示层换 NOAA 官方分析场并如实记录。

**验证结果**：typecheck 0 错误；build 成功；dev 正常；环境图层真实数据就绪。

---

## Round 5 · 「哪里更危险？」科普型空间风险与暴露分析

**Prompt 关键内容（摘录）**：不建立业务级灾害预测模型，只做透明、可解释、可追溯的“科普型空间风险提示”；研究区=海南北部—琼州海峡—雷州半岛（固定 AOI，不硬编码进组件）；只用三个因素：地形/低海拔、人口暴露、路径邻近度；禁止伪造风圈/风暴潮/降雨、禁止“距离冒充风速”、禁止任意调权重；DEM 优先 Copernicus GLO-30，人口建议 WorldPop；路径邻近度=到真实轨迹的最小测地距离（derived-analysis，名称必须用“台风路径邻近度”）；综合提示必须写成确定性可审计规则并标记 derived-analysis + science-communication-only；点击查询显示高程/人口暴露/距路径/空间提示 + 免责声明；脚本化可复现 + QA 输出；数据源获取困难时不花数小时绕登录，报告阻塞项。

**AI 参与环节**：
- 建立 AOI 配置 `risk/aoi.json`（含确定性规则全文，不硬编码进 React）。
- 数据获取：Copernicus DEM GLO-30（AWS Open Data，13 瓦片，免登录）✓；WorldPop 中国 100m 完整文件为 4.6 GB → **报告阻塞项后改用 Kontur Population 400m（HDX 公开，215MB，bbox 过滤读取）**。
- 四个脚本（可复现 + QA）：`prepare_terrain.py`（海岸线掩膜/高程分级）、`prepare_population.py`（六边形质心聚合/密度）、`compute_track_proximity.py`（WGS84 球面交叉航迹距离，36 点轨迹）、`build_risk_awareness.py`（确定性三因子规则 → 关注分级 + 点击查询网格 grid.json）。
- 前端：4 个 risk 图层（不默认全开）、章节 04 四步卡片、点击查询卡片（含免责声明）、风险来源卡片；SourceType 扩展 terrain/population。

**人工核验**：
- 海岸线掩膜前后对比：无掩膜时海洋 0 值被误判为低洼（低洼 38,294 像元），掩膜后陆地 28,702 像元、低洼 4,309（合理）。
- QA 数值审阅：AOI 内总人口 1052.7 万（海口+湛江量级合理）；密度峰值 60,899 人/km²（高密度城区合理）；距离范围 0–162 km（轨迹穿 AOI 合理）；关注分级计数（重点关注 1,562 / 较高 36,762 / 一般 39,876）。
- 数据源变更如实记录（WorldPop 4.6GB 受限 → Kontur，来源/年份/分辨率写入 manifest）。

**发现的问题与修正**：
1. WorldPop 100m = 4.6GB（截断下载）→ 按规则报告并改用 Kontur 400m，未花数小时绕下载。
2. Kontur gpkg 为 EPSG:3857 → bbox 过滤需先转墨卡托坐标。
3. GLO-30 沿岸瓦片含海面 0 值 → 引入 Natural Earth 110m 海岸线掩膜区分海陆。
4. 全幅中国栅格重投影 chunk 失败 → 改为按 AOI 窗口读取。

**验证结果**：typecheck 0 错误；build 成功；dev 正常（5173 保持运行）；risk 全部端点 HTTP 200；轨迹/登陆/卫星帧/DEMO 回归正常。

---

## Round 6 · 补齐 02/05/06 章节，完成六章节故事闭环

**Prompt 关键内容（摘录）**：02 增加轻量科普（台风不随意移动/大尺度环流引导/副高影响/转向/预测滚动更新），机制示意图必须标注“机制示意，不代表 YAGI 当时真实大气分析场”，多条示意预测路径必须标注“预测不确定性示意”、不得称为真实集合预报；05 用本项目真实工作流表达 AI 作用（四项：多源数据整理/数据处理与可视化代码/交互地图/科普表达），并增加“AI为什么不能直接相信？”（用 nmcFlagRaw 真实审计案例），不接 LLM、不虚构 AI 预测；06 四种情境（沿海/低洼城区/山区/家中）+ 应急包（8 项简单图标）+ “先看官方预警，再做行动判断”；六章节导航加已读标记（不游戏化）；首次进入轻量引导“跟着六个问题，一起追踪一场真实台风。”+“开始追风”；章节间过渡语（01→02“台风已经形成…”等）。

**AI 参与环节**：
- 生成两份示意图 GeoJSON（`schematic/steering-schematic.geojson`、`forecast-uncertainty-schematic.geojson`），全部带 `schematic: true` 与“非真实大气分析场/非真实集合预报”说明，图例与弹窗均重复标注。
- 章节配置加入 `nextHint` 过渡语；InfoPanel 新增 02 机制卡（5 条机制解释 + 两个示意图层开关 + “为什么预测路径会变？”）、05 工作流卡（8 步流水线 + AI 四项作用 + nmcFlagRaw 案例）、06 行动卡（四情境 + 应急包图标网格 + 预警免责）、底部“故事线/下一问”过渡。
- 章节导航“已读”轻量标记；首次进入引导（localStorage 记忆，不重复打扰）。

**人工核验**：
- 示意图位置/文案逐条对照 Prompt 要求核对（“机制示意”“预测不确定性示意”字样三处以上出现）。
- 05 案例描述与真实审计记录一致（nmcLandfallFlag → nmcFlagRaw，见 Round 3 记录）。
- 应急包 8 项仅含安全、常见、无专业门槛的物品。
- typecheck/build/dev；示意数据端点验证。

**发现的问题与修正**：
1. 命令行内联 Node 生成中文 GeoJSON 出现编码错误 → 改为脚本文件（UTF-8）执行。
2. 05/06 内容初稿过于“论文式” → 按要求改为短句要点式表达。

**验证结果**：typecheck 0 错误；build 成功；dev 正常；六章节可独立进入、故事线连续。

---

## Round 6.5 · 提交前溯源与文档一致性清理

**Prompt 关键内容（摘录）**：提交前一致性清理，不新增功能/数据集/算法/图层/UI；修复「数据内容 vs 脚本 vs manifest vs summary vs README vs provenance 文档」的不一致；全部科学数值必须逐字节不变；README 简洁并明确「无机器学习模型/训练/权重/随机种子/数据集划分」与「AI = 数据处理 / 代码 / 核验 / 叙事辅助」。

**AI 参与环节**：
- 全库 grep 定位 33 处 WorldPop，区分「历史记录（保留）」与「当前口径（应改 Kontur）」；修改 `scripts/build_risk_awareness.py` 4 处与 `risk/aoi.json` 1 处。
- 重建 ASCII 临时工作目录，完整重跑 4 个风险脚本（prepare_terrain → prepare_population → compute_track_proximity → build_risk_awareness），并重新下载 Natural Earth 110m 海岸线掩膜。
- 修复 `yagi-2024/manifest.json` 描述（反映轨迹 + 登陆已接入、风圈待接入）；`src/data/cases.ts` 的 dataStatus/描述/起止时间；TyphoonMap 点击查询地形分级标签（「10–30 m」→「>10 m」，消除与查询网格三分类语义不一致）。
- 更新 `public/data/README.md`、`public/data/raw/cma/README.md`、根 `README.md`（补「无机器学习模型」与「AI 角色」声明）。

**人工核验**（重跑管线后逐项比对，全部与提交前一致）：
- 轨迹 36 点 / 风速 13–62 m/s / 气压 915–1004 hPa / 时间 2024-09-01T00:00Z–09-08T12:00Z；登陆 2 次；卫星 6 帧；SST 2 帧。
- 关注分级计数：重点关注 1,562 / 较高关注 36,762 / 一般关注 39,876；网格 340×230 = 78,200 像元。
- terrain / population / proximity 的 summary 与 PNG、`grid.json` 重生成后与旧版逐字节相同（git 未列入变更，证明科学数值零改动）。

**发现的问题与修正**：
1. `build_risk_awareness.py` 硬编码 WorldPop 为「当前人口来源」→ 改为 Kontur，并重生成 attention-summary / attention manifest / sources.json。
2. 脚本写 `sources.json` 时输出裸数组 `[...]`，而 loader 期望对象 `{"sources":[...]}`（原文件为手工包装的对象）→ 修复为 `json.dump({"sources": sources}, ...)`，消除「脚本→输出→loader」不一致。
3. `cases.ts` 仍把 yagi-2024 标为 awaiting-authoritative-data 且描述「待接入」（实际已 available，且该描述直接展示给用户）→ 修正为 available + 准确描述。
4. 点击查询地形标签误用展示层 4 档（0–5 / 5–10 / 10–30 / >30）套查询网格 3 档（≤5 / 5–10 / >10），出现「10–30 m」错配与不可达的「>30 m」分支 → 改为「>10 m · 地形关注：低」。
5. `raw/cma/README.md` 仍暗示「案例 awaiting 等待 CMA-BST」（实际已用台风网接入 available，CMA-BST 仅交叉核验）→ 修正。
6. 行尾说明：Python 在 Windows 生成的文件为 CRLF；`risk/sources.json` 原为手工包装 LF → 本次按各自 HEAD 行尾最小化 diff（sources.json 保持 LF，其余脚本生成物保持 CRLF），未做全局行尾统一，以免产生字节级噪音。

**验证结果**：typecheck 0 错误；build 成功；dev 重启正常（5173）；风险数据重生成数值字节级不变。

---

## Round 7 · 投稿前总审计、地图合规、部署与打包

**Prompt 关键内容（摘录）**：正式投稿前总审计；不加新数据集、不重算科学分析、不改风险阈值、不加模型/算法、不补风圈、不尝试 CMA-BST、不重构架构；默认必须进入 REAL YAGI，DEMO 次级；地图合规 P0（台湾/海南/南海诸岛/国界/审图号，不自行宣称合规）；运行时外部网络审计；底图失败降级（不白屏、不无限 loading、不显示 stack trace）；六章节评委走查；科学性全文搜索；AI 创作记录正式化 + 截图清单；数据/素材说明；性能审计；PC 布局；异常数据测试；正式 build；部署准备（Vercel/GitHub Pages）；submission 目录；BLOCKERS；最终可提交判定。

**AI 参与环节**：
- 代码修复：默认案例改为真实 YAGI（此前 `TYPHOON_CASES[0]` 为 demo-synthetic）；DEMO 卫星瓦片（NASA GIBS，固定 2025 日期）仅在 DEMO 加载；REAL 模式图层面板隐藏 demo-only 图层（卫星云图/风险分区/避险点）；底图失败自动回退本地纯色样式并提示“在线底图暂时无法加载，核心科普数据仍可正常浏览”。
- 修正 EnvironmentStatus 状态条：明确“卫星=FY-4B AGRI 观测”“SST=NOAA Coral Reef Watch 日分析场（多源卫星融合，非单星瞬时观测）”，补齐单位 °C 与日尺度。
- 构建剔除 `public/data/raw/` 原始大文件（Copernicus DEM / Kontur gpkg / FY-4B NC/JPG），`dist` 由 598 MB 降至 16.6 MB。
- 生成 `docs/competition/{map-compliance,network-dependency,performance,scientific}-audit.md`、`DEPLOYMENT.md`、`BLOCKERS.md` 与 `submission/` 投稿目录。

**人工核验**：
- typecheck / build 通过；dev 重启正常（5173）。
- 底图失败降级人工走查：error → 本地回退 + 提示，无白屏、无无限 loading、无 stack trace。
- 全文检索：无 MOCK/TEST/PLACEHOLDER/TODO/DEBUG/localhost/开发中；无“精确/精准/官方风险/最危险/伤亡预测/实时”等敏感词；“预测”均带“示意 / 非真实集合预报”限定。

**发现的问题与修正**：
1. 默认案例是 DEMO（`TYPHOON_CASES[0]`）→ 评委若曾访问过会停留在 DEMO → 改为默认真实 YAGI。
2. `dist` 含 `public/data/raw` 原始大文件（598 MB）→ 构建插件剔除，降至 16.6 MB，避免部署未处理原始数据。
3. REAL 模式仍显示 DEMO 卫星图层（NASA GIBS 演示瓦片，固定 2025 日期，易被误当真实云图）→ `kind==='demo'` 守卫 + 面板隐藏。
4. 底图失败无降级（`ready` 永假、无限“正在初始化地图”）→ 本地纯色回退 + 提示。
5. EnvironmentStatus 把 SST 误标为 FY-4B → 修正为 NOAA CRW 日分析场（非单星瞬时观测）。

**验证结果**：全部通过；科学数值零改动；仅剩 P0 = 地图底图合规需人工核查（见 map-compliance-audit.md）。

---

## Submission P0 Fix（Round 7 之后，投稿前）

**任务**：正式底图移除 CARTO → 切换为国家地理信息公共服务平台“天地图”（官方服务，直连，无第三方代理）；token 环境变量与降级；03 章风圈文案与真实数据状态对齐；AI 截图与正式 URL 升级为 P0 SUBMISSION_REQUIRED；Vercel 部署准备。

**AI 参与环节**：
- `src/services/mapConfig.ts`：删除 CARTO `MAP_STYLE_URL`；新增 `VITE_TIANDITU_TOKEN`、天地图署名与 `FALLBACK_MAP_STYLE`（本地纯色回退）。
- `src/services/layers.ts`：新增天地图 WMTS 栅格源（`t{s}.tianditu.gov.cn`，vec_w 矢量 + cva_w 注记）与图层构建，源/图层 id 独立于业务图层清理集合（跨案例保持）。
- `src/components/TyphoonMap/TyphoonMap.tsx`：基础样式改为本地回退样式（不再依赖在线 style URL）；load 后按 token 叠加天地图；token 缺失提示“正式底图服务尚未配置，核心科普数据仍可浏览。”；瓦片加载失败提示“在线基础地图暂时无法加载，核心科普内容仍可浏览。”；不白屏、不无限 loading、无 stack trace。
- `src/styles/global.css`：天地图署名与比例尺控件上移，不被底部时间轴遮挡（attribution 可见）。
- `src/data/chapters.ts`：03 章风圈 keyPoint 改为“业务预报常用七级/十级/十二级风圈描述大风影响范围；本案例未取得完整可追溯的历史风圈时序，正式展示不使用推算或插值风圈（数据待接入）”，与 wind-radii 占位状态一致。
- 新增 `.env.example`；`.gitignore` 排除 `.env*`；`src/vite-env.d.ts` 补 `VITE_TIANDITU_TOKEN` 类型。
- 文档：`map-compliance-audit.md`（天地图 + 人工检查清单 + 明确“不宣称已通过审核”）、`network-dependency-audit.md`、`asset-attribution.md`、`BLOCKERS.md`（截图/URL 升级 P0 SUBMISSION_REQUIRED）、`DEPLOYMENT.md`（Vercel 9 步 + token 申请）、`screenshot-checklist.md` / `screenshots/README.md`（P0 + 建议命名）。

**人工核验**：
- typecheck 0 错误；build 通过；`dist/assets` 中 **0 处 carto/cartocdn 引用**（CARTO 彻底退出正式 runtime）。
- 科学数值零改动；03 章文案与数据状态一致；token 缺失路径走查（纯色回退 + 提示，不白屏）。

**验证结果**：通过。剩余 P0 均为人工项：天地图 token、最终地图人工检查、≥2 张真实截图、正式公网 URL、作者/团队信息。

---

## 关键决策记录（为什么这么做）

1. **为什么拒绝伪造风圈**：YAGI 生命周期风圈数据缺失（业务通报仅有登陆时刻的少数描述，且非完整风圈序列）。制造/插值风圈会把未观测信息伪装成观测事实，违背“数值必须有来源、可追溯”。作品明确显示风圈“待接入”，并在数据模型中为 sparse 观测预留能力，禁止插值冒充完整序列。
2. **为什么把 nmcLandfallFlag 改为 nmcFlagRaw**：该字段来自台风网 API 原始响应第 8 列，官方语义无法证实（无文档；对照台风验证请求被站点 502 阻断）。在无法确认语义前，不得将其描述为“官方登陆标记”，更不得用于登陆点生成。改名 + 注明“语义未经证实”，把审计结论固化在数据里。
3. **为什么 SST 展示层用 NOAA 分析产品而非低质量 FY-4B 像元强行插值**：FY-4B AGRI SST 在该时次区域内高质量像元仅约 1%（台风云系覆盖）。若对其插值成完整场，等于编造观测。因此 FY-4B 观测保留为证据（区域均值 28.8/28.4°C），展示图层改用 NOAA Coral Reef Watch 官方分析场，并如实记录来源差异与量级交叉核验。
4. **为什么风险地图明确标成科普型 derived analysis**：三因子组合只是“空间关注提示”，不是业务灾害风险模型；无风圈/降雨/风暴潮输入，不能承载“风险预报”含义。故规则写成确定性、可审计文本，全部输出标记 derived-analysis + purpose=science-communication-only，并在交互处反复声明“以官方预警为准”。

---

## 人工核验总览

| 轮次 | 关键人工核验 | 结果 |
| --- | --- | --- |
| 1 | npm install / typecheck / build / dev | 通过 |
| 2 | REAL 不假装成功、DEMO 隔离 | 通过 |
| 2.5 | 36 点 QA + 公开资料交叉核验 | 通过 |
| 3 | 官方原文逐字比对两次登陆数值 | 通过（null=0） |
| 4 | 卫星几何方向/比例定量验证 + SST 交叉 | 通过 |
| 5 | 风险 QA 数值审阅 + 数据源变更如实记录 | 通过 |
| 6 | 示意图/文案/应急包逐条核对 | 通过 |
| 6.5 | 重跑风险管线，科学数值字节级不变 | 通过 |
| 7 | 默认 REAL 案例 / 底图降级 / dist 剔除原始数据 / 全文科学与网络审计 | 通过 |
| P0-Fix | 底图天地图化 / CARTO 0 引用 / 03 风圈文案对齐 / token 缺失降级 | 通过 |

**未解决事项**：地图底图合规最终人工检查（底图已换天地图官方服务；未取得正式证明前不宣称“已通过审核”）；天地图 token 待申请配置；AI 截图 ≥2 张、正式公网 URL、作者/团队信息待人工补录；tcdata WAF（CMA-BST 文件待人工获取，仅交叉核验）；风圈数据仍缺失（保持占位，未伪造/未插值）。
