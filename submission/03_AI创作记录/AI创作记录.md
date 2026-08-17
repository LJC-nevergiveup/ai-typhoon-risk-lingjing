# AI 创作记录（正式版）

> 作品：AI 台风风险灵境 · 和 AI 一起追“风”去
> 参赛：首届时空灵境 · AI 地理科普行动
> 说明：本文件按轮次整理 AI 参与过程，每轮统一使用「AI 任务 / 人工输入 / AI 输出 / 人工核验 / 发现问题 / 最终处理」六栏；
> 完整技术日志与原始 Prompt 摘录见项目 `docs/competition/ai-creation-log.md`。

## 核心原则（贯穿全部轮次）

**AI 辅助 ≠ AI 自主得出结论。** 本作品没有机器学习模型、没有训练、没有权重、没有随机种子，也不存在
训练 / 验证 / 测试集划分。AI 只承担数据处理、代码编写、质量核验、叙事表达四类辅助工作；
任何 AI 产出的数值、代码与结论，都必须经过人工核验，科学事实以权威资料为准。

---

## Round 1 · 工程初始化与基础 UI

- **AI 任务**：从零初始化 Vite + React + TypeScript 工程，搭建六章节导航、地图容器、时间轴、图层面板，建立数据与 UI 分离的目录结构。
- **人工输入**：技术栈固定（React + Vite + TS + MapLibre GL JS + ECharts + 原生 CSS）；顶部标题“AI 台风风险灵境 / 和 AI 一起追‘风’去”；六章节单页导航（不做六个独立网页）；PC 优先（1366×768 与 1920×1080）；DEMO 与真实数据必须严格分离并明确标记。
- **AI 输出**：项目骨架、全部组件（Header / ChapterNavigation / TyphoonMap / InfoPanel / Timeline / LayerControl / EChart）、types / data / services / utils 分层、3 个 `-demo` 后缀演示数据文件（内部 `demo: true`）。
- **人工核验**：`npm install`（98 包）、`npm run typecheck`、`npm run build`、`npm run dev`，页面与演示数据端点 HTTP 200。
- **发现问题**：① `npm create vite` 因沙箱无法写全局 npm 缓存而失败；② maplibre 类型报错（`AddSourceObject` 不存在等）；③ 构建 chunk 过大。
- **最终处理**：① 手动搭建工程 + `.npmrc` 将缓存重定向到项目内；② 改用 `SourceSpecification` 与自定义 `DemoFeatureCollection` 类型；③ `manualChunks` 拆分 maplibre / echarts / react。

## Round 2 · REAL / DEMO 案例系统

- **AI 任务**：建立 `public/data/real/yagi-2024/` 数据包与 manifest / track / landfalls / wind-radii / sources；统一真实台风数据模型；案例注册与 loader 判别联合；数据来源机制。
- **人工输入**：无权威真实数据时不得编造“摩羯”数值，占位必须标记 `status: awaiting-authoritative-data`；REAL 加载失败不允许静默回退 DEMO；地图与时间轴支持任意轨迹长度与不等时间间隔；建立数据来源机制（机构 / 数据集 / URL / 获取日期 / 用途说明 / 许可说明）。
- **AI 输出**：案例注册表 `cases.ts`、重构 `loaders.ts`（判别联合 `ready/unavailable/error`）、真实轨迹模型与解析校验、登陆点图层与 Popup、时间轴由 timestamp 驱动、Header 案例选择器与 REAL / DEMO 徽标、sources.json 机制。
- **人工核验**：typecheck / build / dev；确认 REAL 占位 `awaiting-authoritative-data` 且前端不会假装成功。
- **发现问题**：写入 TyphoonMap 时曾混入草稿笔记导致语法错误。
- **最终处理**：全文重写修复；DEMO 与 REAL 物理隔离验证通过。

## Round 2.5 · YAGI 真实轨迹接入（台风网官方数据）

- **AI 任务**：获取 CMA 最佳路径文件；若不存在则停止并报告，不伪造、不从第三方替代；建立导入脚本并生成真实 track.geojson。
- **人工输入**：不依赖行号、不假设固定 6 小时间隔、单位正确转换、保留原始字段与 provenance、QA 摘要、异常不静默修复；sources 口径中 CMA-BST=primary、IBTrACS/JMA=cross-validation。
- **AI 输出**：发现 CMA-BST 原始文件缺失 → 按指令停止数据生成，先交付 `import-cma-best-track.ts`（含 `--self-test`）；tcdata.typhoon.org.cn 被 SafeLine WAF（HTTP 468）拦截后**未尝试绕过**，改用同机构官方渠道中国气象局台风网 API（typhoon.nmc.cn，台风 id 3275487），保存 `raw/nmc/yagi-2024-view.json`；编写 `import-nmc-track.ts` 并生成 `track.geojson`（36 个真实时次）。
- **人工核验**：QA——36 点、2024-09-01T00:00Z—09-08T12:00Z、12.2–21.9°N、103.6–126.2°E、13–62 m/s、915–1004 hPa、0 缺失、10 条 3 小时加密、epoch 一致性 0 异常；峰值 62 m/s / 915 hPa 与官方发布交叉核验一致。
- **发现问题**：① tcdata 官方站 WAF 无法程序化下载；② 自检中 epoch 校验正则漏删冒号导致误报；③ 真实数据“轨迹就绪、登陆点/风圈占位”的部分就绪状态。
- **最终处理**：① 不绕过 WAF，改用台风网官方 API 并如实记录来源差异；② 修正正则 `/[-T:]/g`；③ loader 增加 warnings 机制并如实提示。

## Round 3 · YAGI 真实登陆过程与证据链（nmcFlagRaw 人工审核）

- **AI 任务**：审计 `nmcLandfallFlag` 字段的来源与语义；建立两次真实登陆；扩展 LandfallPoint 与 SourceType；建立登陆证据链与资料口径说明。
- **人工输入**：坐标不能凭感觉填写，允许 geocoded-location / approximate-for-visualization 并写明用途；全部数值有来源、可追溯、不手工修改；SourceType 区分 historical-track 与 operational-bulletin；风圈继续缺失。
- **AI 输出**：审计发现原始 JSON 字段 8 全为 `"no"`（36/36），官方语义无法证实（对照实验被 NMC 502 阻断）→ 按最保守口径**改名 `nmcFlagRaw`** 并注明“官方语义未经证实”，重生成 track.geojson（数值零改动）；多源检索核验两次登陆四个数值；生成 `landfalls.geojson`（文昌 62 m/s / 915 hPa、徐闻 58 m/s / 925 hPa，coordinateType=geocoded-location，注明仅可视化）；LandfallPoint / TyphoonEvent / SourceType 扩展、登陆 Popup、时间轴 ▲ 标记与 ±3h 临近高亮。
- **人工核验**：央广网原文逐字比对（“17级以上（62米/秒），915hPa” / “17级（58米/秒），925百帕”）；JSON 合法性；typecheck / build / dev；DEMO 回归。
- **发现问题**：① 国内站点初期不可达（502 / 000 / JS 壳页）；② 徐闻数值最初未获权威确认。
- **最终处理**：① 不放弃也不编造，先诚实留 null，网络恢复后第一手核验再写入；② 确认 58 / 925 后写入并保留原文出处；最终 null 字段数 = 0。

## Round 4 · 「台风从哪来」真实卫星云图、SST 与形成机制

- **AI 任务**：建立 environment/satellite | sst 数据包与 SatelliteFrame / SstFrame 模型；接入 FY-4B 真彩云图与 SST；完成章节 01 三步科普与图层 / 时间联动。
- **人工输入**：禁止编造卫星影像、AI 生成图冒充、SST 编造、绝对化表述；官方站点需登录 / 验证码 / 人工下载则**不绕过**，只建 schema / importer 并告知人工下载清单；4–6 个代表时刻以实际获取为准；处理后图像不得描述为“原始数据”。
- **AI 输出**：探测官方渠道（satellite.nsmc.org.cn / data.nsmc.org.cn 等）确认档案产品需人工登录下载，**未绕过、未改用第三方**；建立 environment 骨架与人工下载清单；类型与加载层；地图 / UI（帧图层、透明度、时间轴最近帧选择、EnvironmentStatus、章节 01 三步科普卡）。用户人工下载后，编写 `import_fy4b_env.py` 将 6 帧真彩（GCLR）重投影到 EPSG:4326 并裁剪；解析 FY-4B SST 发现该时次区域内高质量像元仅约 1%。
- **人工核验**：几何验证（海南岛陆地暖色 / 台湾海峡深蓝方向正确；09-05 / 09-06 台风眼区距轨迹点 ≤0.5°）；SST 交叉（FY-4B 稀疏有效像元均值 28.8 / 28.4°C 与 CRW 分析场 ~30°C 量级一致）；typecheck / build / dev；环境 manifest 端点验证（6 卫星帧 + 2 SST 帧 HTTP 200）。
- **发现问题**：① 官方站点登录墙；② 中文路径在 Python / netCDF4 C 库下不可解析；③ 4KM 网格角采样误用“除 4”；④ 东西向符号反；⑤ GCLR 尺寸非标称正方形；⑥ FY-4B SST 约 99% 云覆盖。
- **最终处理**：① 不绕过登录，用户人工下载后接入；② ASCII 临时目录处理；③ 修正采样为“乘 4”；④ 用 SST 分布 + 地物特征定量判定方向；⑤ 弃用固定中心假设，实测圆盘中心与半径；⑥ **不插值、不冒充**，FY-4B 观测保留为证据，SST 展示层改用 NOAA Coral Reef Watch 官方分析场并如实记录来源差异。

## Round 5 · 「哪里更危险？」科普型空间风险与暴露分析

- **AI 任务**：建立透明、可解释、可追溯的科普型空间风险提示；三因子（地形 / 人口 / 路径邻近度）；确定性规则；点击查询；可复现脚本。
- **人工输入**：不建立业务级灾害预测模型；固定 AOI 不硬编码进组件；只用地形 / 人口 / 路径邻近度三因子；禁止伪造风圈 / 风暴潮 / 降雨、禁止“距离冒充风速”、禁止任意调权重；邻近度名称必须用“台风路径邻近度”；标记 derived-analysis + science-communication-only；数据获取困难时报告阻塞项而非耗时绕登录。
- **AI 输出**：`risk/aoi.json`（确定性规则全文）；Copernicus DEM GLO-30（AWS Open Data，13 瓦片）；WorldPop 中国 100m 完整文件约 4.6 GB 受限 → **报告阻塞后改用 Kontur Population 400m（HDX，215MB）**；四个可复现脚本（prepare_terrain / prepare_population / compute_track_proximity / build_risk_awareness）；前端 4 个 risk 图层、章节 04 四步卡、点击查询卡（含免责声明）、风险来源卡。
- **人工核验**：海岸线掩膜前后对比（掩膜前海面 0 值被误判为低洼，掩膜后陆地 28,702 像元、低洼 4,309，合理）；QA 数值审阅（AOI 内总人口 1052.7 万、密度峰值 60,899 人/km²、距离 0–162 km、关注分级计数 1,562 / 36,762 / 39,876）；数据源变更如实记录。
- **发现问题**：① WorldPop 100m 4.6 GB 截断下载；② Kontur gpkg 为 EPSG:3857；③ GLO-30 沿岸瓦片含海面 0 值；④ 全幅中国栅格重投影 chunk 失败。
- **最终处理**：① 报告并改用 Kontur 400m；② bbox 过滤前先转墨卡托坐标；③ 引入 Natural Earth 110m 海岸线掩膜区分海陆；④ 改为按 AOI 窗口读取。

## Round 6 · 补齐 02 / 05 / 06 章节，完成六章节故事闭环

- **AI 任务**：02 机制科普与示意图层；05 AI 工作流与“为什么不能直接相信 AI”；06 四情境与应急包；已读标记、首次引导、章节过渡语。
- **人工输入**：机制示意图必须标注“机制示意，不代表 YAGI 当时真实大气分析场”，多条示意路径必须标注“预测不确定性示意”、不得称为真实集合预报；不接 LLM、不虚构 AI 预测；应急包仅含安全、常见、无专业门槛的物品。
- **AI 输出**：两份 schematic GeoJSON（steering-schematic、forecast-uncertainty-schematic，均带 `schematic: true` 与说明）；chapters.ts 增加 `nextHint` 过渡语；InfoPanel 新增 02 机制卡、05 工作流卡（8 步流水线 + AI 四项作用 + nmcFlagRaw 真实审计案例）、06 行动卡（四情境 + 应急包）；章节导航“已读”标记与首次进入引导（localStorage 记忆）。
- **人工核验**：示意图位置 / 文案逐条对照要求（“机制示意”“预测不确定性示意”字样三处以上）；05 案例描述与真实审计记录一致；应急包 8 项核验；typecheck / build / dev；示意数据端点验证。
- **发现问题**：① 命令行内联 Node 生成中文 GeoJSON 编码错误；② 05 / 06 初稿过于“论文式”。
- **最终处理**：① 改为脚本文件（UTF-8）执行；② 按要求改为短句要点式表达。

## Round 6.5 · 提交前溯源与文档一致性清理

- **AI 任务**：提交前一致性清理，不新增功能 / 数据集 / 算法 / 图层 / UI；修复“数据内容 vs 脚本 vs manifest vs summary vs README vs provenance”的不一致，科学数值逐字节不变。
- **人工输入**：README 简洁并明确“无机器学习模型 / 训练 / 权重 / 随机种子 / 数据集划分”与“AI = 数据处理 / 代码 / 核验 / 叙事辅助”。
- **AI 输出**：全库定位 33 处 WorldPop，区分“历史记录（保留）”与“当前口径（应改 Kontur）”；重建 ASCII 临时目录完整重跑 4 个风险脚本并重新下载海岸线掩膜；修复 manifest 描述、cases.ts 状态与描述、点击查询地形标签、README 声明。
- **人工核验**：重跑后轨迹 36 点 / 风速 13–62 m/s / 气压 915–1004 hPa / 时间 09-01—09-08、登陆 2 次、卫星 6 帧、SST 2 帧逐项一致；关注分级计数与网格数（340×230 = 78,200）一致；terrain / population / proximity 的 summary 与 PNG、grid.json 重生成后与旧版**逐字节相同**。
- **发现问题**：① build_risk_awareness.py 硬编码 WorldPop 为当前人口来源；② 脚本写 sources.json 输出裸数组；③ cases.ts 仍标 awaiting-authoritative-data；④ 点击查询地形标签 4 档与查询网格 3 档错配；⑤ raw/cma README 措辞过时。
- **最终处理**：① 改为 Kontur 并重生成相关文件；② `json.dump({"sources": ...})` 包装为对象；③ cases.ts 改为 available + 准确描述；④ 标签改「>10 m」消除语义不一致；⑤ 修正措辞。

## Round 7 · 比赛提交材料整理（submission 目录生成）

- **AI 任务**：依据冻结事实与项目文档，生成 `submission/` 投稿目录（纯 Markdown / 文本），不打包、不建远程仓库、不执行 npm / python 命令。
- **人工输入**：冻结事实清单（作品名、案例、六章节、科学数值、AI 角色、风圈占位、技术栈）；目录结构与各文件内容要求；不得修改 submission/ 之外的任何文件。
- **AI 输出**：`01_作品`（链接占位、README）、`02_作品说明`、`03_AI创作记录`（本文件 + 截图清单 + 截图占位目录）、`04_数据与素材说明`（数据来源 + 素材版权）、`05_运行说明`。
- **人工核验**：待作者完成——团队 / 作者信息（TODO_USER_FILL）、正式访问 URL、历史会话截图补录、素材许可终审；本文档所写科学数值均与 `docs/competition/data-provenance.md`、各 manifest / sources.json 核对一致，未改动任何数值。
- **发现问题**：作者信息与正式部署 URL 尚缺；历史 Codex 会话截图需从真实会话补录。
- **最终处理**：以 TODO_USER_FILL / 占位标注待补项，**不编造 URL、截图内容与素材许可**。

---

## 人工核验总览

| 轮次 | 关键人工核验 | 结果 |
| --- | --- | --- |
| 1 | npm install / typecheck / build / dev | 通过 |
| 2 | REAL 不假装成功、DEMO 隔离 | 通过 |
| 2.5 | 36 点 QA + 官方发布交叉核验 | 通过 |
| 3 | 官方原文逐字比对两次登陆数值（nmcFlagRaw 审计） | 通过（null=0） |
| 4 | 卫星几何方向 / 比例定量验证 + SST 交叉 | 通过 |
| 5 | 风险 QA 数值审阅 + 数据源变更如实记录 | 通过 |
| 6 | 示意图 / 文案 / 应急包逐条核对 | 通过 |
| 6.5 | 重跑风险管线，科学数值字节级不变 | 通过 |
| 7 | 文档数值与 provenance / manifest 核对；待作者补录占位项 | 数值一致；占位项待作者 |

## 真实人工审核案例（要点）

1. **nmcLandfallFlag → nmcFlagRaw**：台风网原始字段 8 官方语义无法证实（36/36 全为 `"no"`），拒绝把它描述成“官方登陆标记”，改名并注明“语义未经证实”，不用于登陆点生成。
2. **FY-4B SST 有效像元不足 → 不插值 → 换 NOAA L4 展示层**：该时次高质量像元仅约 1%，插值等于编造观测；FY-4B 观测保留为证据，展示层改用 NOAA Coral Reef Watch 分析场并如实记录。
3. **缺完整权威风圈 → 拒绝生成假风圈**：风圈数据缺失即缺失，保持 `awaiting-authoritative-data` 占位，未伪造、未插值。
4. **风险结果 → 明确 derived analysis**：三因子组合只是科普型空间关注提示，标记 derived-analysis + science-communication-only，并反复声明“以官方预警为准”，不属于官方灾害风险预报。

**未解决事项**：tcdata WAF（CMA-BST 文件待人工获取，仅用于轨迹交叉核验）；风圈数据仍缺失（保持占位，未伪造 / 未插值）。
