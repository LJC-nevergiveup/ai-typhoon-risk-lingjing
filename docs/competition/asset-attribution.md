# 素材来源与署名清单（asset-attribution）

> 本文件逐项登记作品用到的素材（图片、GeoJSON、JSON、SVG、字体、图标、底图瓦片）的
> 来源、机构、URL、许可/使用说明、是否修改、处理步骤与使用位置。
> 扫描范围：`public/data/`（`demo/` 与 `real/`）与 `src/`。
>
> 判定规则：**任何来源不明的素材一律标记 `BLOCKING_UNKNOWN_SOURCE`，不猜测许可**。
> 数据口径铁律（摘自项目 AGENTS.md）：处理后图像不得称为"原始卫星数据"；
> 示意图层标注"机制示意 / 预测不确定性示意"；空间关注提示标注"科普型空间分析，
> 不属于官方灾害风险预报"。

---

## 一、成品素材主表

### 1. 卫星云图（真实案例，FY-4B AGRI）

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fy4b-agri-gclr-202409010000.png` … `fy4b-agri-gclr-202409060600.png`（共 6 帧，2024-09-01 00:00 / 09-02 00:00 / 09-03 00:00 / 09-04 00:00 / 09-05 06:00 / 09-06 06:00 UTC） | PNG（栅格图像） | 风云四号 B 星（FY-4B）AGRI 真彩图像（GCLR）L2 · 全圆盘 1000M 官方产品（用户自风云卫星遥感数据服务网**人工下载**原始 JPG） | 国家卫星气象中心（NSMC / 中国气象局 CMA） | https://satellite.nsmc.org.cn/ | 中国气象局官方数据，科研与教育用途，使用时注明来源 | **是**（处理后**不得**称"原始卫星数据"） | 标称网格（nominal subpoint 105°E）→ EPSG:4326 等经纬度重投影（双线性重采样）→ 裁剪至 105–140°E、5–30°N → 保存为 PNG；气象数值未修改 | REAL 案例"真实卫星云图"图层（envSatellite），6 个时次时间轴 |
| 原始 JPG（`raw/nsmc/FY4B-_AGRI--_..._GCLR_..._1000M_V0001.JPG` ×6） | JPG（原始只读） | 同上（原始产品，未处理） | 国家卫星气象中心（NSMC） | https://satellite.nsmc.org.cn/ | 同上 | 否（只读） | 无（原始文件只读，不入库） | 仅存档于 `public/data/raw/nsmc/`，作为处理源头 |

### 2. 海表温度 SST（真实案例，NOAA Coral Reef Watch）

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `noaa-crw-sst-20240901.png`、`noaa-crw-sst-20240905.png`（2 帧，2024-09-01、09-05） | PNG（栅格图像） | NOAA Coral Reef Watch Daily Global 5km Satellite SST (CoralTemp) 日分析场，经 **NOAA CoastWatch ERDDAP** 下载数据（CSV） | NOAA Coral Reef Watch / NOAA CoastWatch ERDDAP | https://coastwatch.noaa.gov/erddap/griddap/noaacrwsstDaily.html | NOAA 公开数据，引用注明 Coral Reef Watch / ERDDAP | **是**（本地色带渲染；数值未修改） | 下载 CSV → 栅格化至 105–140°E、5–30°N（数值未修改）→ 本地蓝→红渐变色带渲染（09-01 范围 25.5–31.9 °C；09-05 范围 25.6–32.4 °C）→ 陆地/缺失像素置灰 → 保存 PNG | REAL 案例"海表温度 SST"图层（envSst），2 个日期 |
| FY-4B AGRI SST L2 NetCDF（`raw/nsmc/FY4B-_AGRI--_..._SST_..._4000M_V0001.NC` ×2） | NetCDF（原始只读） | FY-4B AGRI 海表温度（SST）L2 官方产品（全圆盘 4KM，°C） | 国家卫星气象中心（NSMC） | https://data.nsmc.org.cn/ | 中国气象局官方数据，科研与教育用途，注明来源 | 否（只读） | 无；该时次区域内高质量像元仅约 1%（台风云系覆盖），作为观测证据保留（区域均值 09-01 ≈28.8 °C / 09-05 ≈28.4 °C），不用于展示图层 | 仅存档于 `public/data/raw/nsmc/`，SST 观测证据 |

### 3. 风险分析图层 PNG（真实案例，4 张）

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `risk/terrain/terrain-lowland.png` | PNG | **derived**：Copernicus DEM GLO-30（30 m 全球数字高程模型，AWS Open Data 公开桶） | Copernicus（欧洲空间局 ESA / 欧盟） | https://registry.opendata.aws/copernicus-dem/ | Copernicus 开放许可，注明来源 | **是**（高程分级渲染；高程数值未修改） | 下载 13 个 1°×1° COG 瓦片 → 合并（4 个纯海域边缘瓦片在桶中不存在，按 NoData/海域处理）→ Natural Earth 110m 海岸线掩膜 → 重采样 0.01° → 分级 0–5/5–10/10–30/>30 m → 渲染 PNG | REAL 案例"地形（低海拔分级）"图层（riskTerrain） |
| `risk/population/population.png` | PNG | **derived**：Kontur Population — China 400m H3 Hexagons（发布版 2023-11-01，人口基础约 2020；输入含 GHSL/WorldPop 等开源数据） | Kontur（via HDX，Humanitarian Data Exchange） | https://data.humdata.org/dataset/kontur-population-china | CC BY（Kontur / HDX），注明来源 | **是**（聚合+密度换算+色带；人口数值未修改） | 按 AOI bbox 过滤读取 GeoPackage → 六边形质心归入 0.01° 网格求和 → 换算密度（人/km²，纬度相关面积）→ 对数色带渲染 PNG | REAL 案例"人口暴露"图层（riskPopulation） |
| `risk/proximity/proximity.png` | PNG | **derived**：NMC 台风网历史轨迹（track.geojson，36 点）→ 最小测地距离（derived-analysis） | 中国气象局台风网（NMC） | http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487 | 中国气象局官方数据，注明来源 | **是**（派生计算渲染） | 输入 = NMC 轨迹（未修改）→ WGS84 球面逐段最小 cross-track 距离（R=6371.0088 km，端点截断）→ 0.01° 网格 → 分级渲染 PNG | REAL 案例"路径邻近度"图层（riskProximity） |
| `risk/attention/attention.png` | PNG | **derived**：Copernicus DEM + Kontur Population + NMC track（三因子确定性规则） | 综合（derived-analysis，规则见 aoi.json） | real/yagi-2024/risk/aoi.json（规则文本） | 科普型空间分析，不属于官方灾害风险预报；注明各因子来源 | **是**（确定性规则合成，未做权重调参） | 三因子分级（terrainHigh≤5m / popHigh≥2000 人/km² / proxHigh≤50km 等）→ 确定性规则：highCount≥2→重点关注；highCount==1 或 medCount≥2→较高关注；其余→一般关注 → 渲染 PNG | REAL 案例"空间关注提示"图层（riskAttention） |

### 4. JSON 数据与清单（真实案例）

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `risk/grid.json` | JSON | **derived**（自建派生数据）：0.01° 网格点击查询数据（lats/lons + 元数据 + 免责声明） | 本项目（由三因子输入派生） | —（本地派生） | 自带 disclaimer："科普型空间分析，不属于官方灾害风险预报" | 是（脚本生成） | 由地形/人口/邻近度网格汇总生成（见 `risk/` 各 manifest 与 `scripts/`） | 风险章"框内点击查询" |
| `risk/aoi.json` | JSON | **derived**（自建）：分析区定义 + 三因子确定性规则文本 | 本项目 | —（本地自建） | purpose=science-communication-only | 是（自建） | 手写/脚本固化规则，可审计 | 风险章规则依据、分析区范围 |
| `risk/sources.json`、`sources.json`（案例级）、`environment/sources.json`（共 3 份来源清单） | JSON | **来源清单**（自建，引用外部机构） | 本项目 | 各来源 URL 见各文件内条目 | 逐条注明机构 + 许可/使用说明 + 访问日期 | 是（自建） | 汇总 Copernicus / Kontur / NMC / NSMC / NOAA / CMA / JMA / IBTrACS 等来源与角色（primary / cross-validation） | 信息面板"数据来源""风险分析数据来源""环境观测资料"卡 |
| `manifest.json`（案例级）、`environment/satellite/manifest.json`、`environment/sst/manifest.json`、`risk/*/manifest.json`（共 7 份清单） | JSON | **自建清单**（记录来源、处理步骤、图例、免责声明） | 本项目 | —（本地自建） | 内嵌 sourceUrl + processing + disclaimer | 是（自建） | 手工/脚本生成，如实登记每帧处理 | 数据包索引（loaders 读取） |
| `risk/terrain/terrain-summary.json`、`population-summary.json`、`proximity-summary.json`、`attention-summary.json`（共 4 份 QA 摘要） | JSON | **derived**（自建派生统计，脚本 QA 输出） | 本项目 | —（本地派生） | 记录来源与规则，可审计 | 是（脚本生成） | 记录 bandCounts / classCounts / 输入来源 / 规则 | 派生结果 QA 凭证（未直接渲染到 UI） |
| `track.geojson` | GeoJSON | NMC 台风网官方历史台风数据（最佳路径分析，36 时次），经 `scripts/import-nmc-track.ts` 生成 | 中国气象局台风网（NMC） | http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487 | 中国气象局官方公开数据，科研与教育用途，注明来源 | **是**（格式转换生成 GeoJSON，数值未修改） | 解析官方 JSONP 原始响应 → 生成 GeoJSON（原始文件存 `raw/nmc/yagi-2024-view.json`） | 轨迹图层、中心风速/气压图表、路径邻近度输入 |
| `landfalls.geojson` | GeoJSON | 中央气象台（NMC）业务通报（2 次登陆：海南文昌、广东徐闻） | 中央气象台（NMC） | 第 1 次 https://www.hainan.gov.cn/hainan/5309/202409/503cf0153a6045d483cf1fd93f3c61b5.shtml ；第 2 次 https://qq.weather.com.cn/news/2024/09/3872661.shtml | 引用业务通报数值，注明发布机构与时间 | **是**（坐标按通报地名地理编码 `geocoded-location`，仅用于地图可视化，非官方登陆点坐标；数值字段有原文出处） | 从业务通报原文提取强度/风速/气压，坐标按地名地理编码 | 登陆点图层 + "登陆过程"卡 |
| `wind-radii.geojson` | GeoJSON | **无来源（空占位）**：status=`awaiting-authoritative-data`，features 为空，未伪造、未插值 | —（待接入） | — | 缺失即缺失，不冒充 | 否 | 无 | 风圈图层占位（前端显示"待接入"） |
| `schematic/steering-schematic.geojson`、`schematic/forecast-uncertainty-schematic.geojson`（共 2 个） | GeoJSON | **自建示意**（`schematic: true`） | 本项目 | —（本地自建） | 标注"机制示意，不代表 YAGI 当时真实大气分析场" / "预测不确定性示意，非真实集合预报" | 是（自建） | 手工构造示意几何（副高椭圆、引导/转向气流、多条示意路径） | 02 章"移动机制示意""预测不确定性示意"图层 |

### 5. DEMO 数据（合成演示，`demo: true`）

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `typhoon-track-demo.geojson` | GeoJSON | **自建合成**（`demo: true`，"合成演示路径：不代表任何真实台风"） | 本项目 | —（本地自建） | 仅界面/流程验证，禁止在正式作品引用 | 是（自建） | 手工构造 15 个合成时次点 | DEMO 案例轨迹 |
| `risk-zones-demo.geojson` | GeoJSON | **自建合成**（`demo: true`，"边界为示意多边形，不代表真实评估结果"） | 本项目 | —（本地自建） | 仅界面/流程验证 | 是（自建） | 手工构造 9 个示意风险分区多边形 | DEMO 案例风险分区 |
| `shelters-demo.geojson` | GeoJSON | **自建合成**（`demo: true`，"名称与容量为示意值，仅用于界面验证"） | 本项目 | —（本地自建） | 仅界面/流程验证 | 是（自建） | 手工构造 8 个示意避险点 | DEMO 案例避险点 |

---

## 二、字体、图标、底图与在线瓦片

| asset | type | source | organization | URL | license-usage note | modified? | processing | usedWhere |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 字体：`'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC', system-ui, -apple-system, 'Segoe UI', sans-serif` | 字体（**系统字体栈，无外部字体文件**） | 操作系统内置字体栈 | Apple / Microsoft / Adobe（思源黑体）/ Google（Noto） | — | 无外部字体下载，随用户系统渲染；未内嵌任何字体文件 | 否 | 无（纯 CSS `font-family` 声明） | 全站文字（`src/styles/global.css`） |
| `favicon.svg` | SVG | **自建**（台风漩涡抽象图形） | 本项目 | —（本地自建） | 自建，无第三方来源 | 是（自建） | 手工绘制 | 站点 favicon（`public/favicon.svg`） |
| 界面图标（💧🥫🔦🔋💊🪪🩹📱🎯 等） | 图标（Unicode emoji） | 系统 emoji 字体 | 操作系统/Unicode Consortium | — | 随系统字体渲染，无外部图标字体/图标库 | 否 | 无 | 06 章应急包、04 章"定位到分析区"等 |
| MapLibre GL 控件图标（zoom/compass/attribution/fullscreen 等 SVG） | 图标（SVG） | MapLibre GL JS npm 依赖内置资源 | MapLibre | https://maplibre.org/ | MapLibre GL 开源许可（BSD-3-Clause），随 `node_modules/maplibre-gl` 打包 | 否（CSS 反色 `filter: invert(0.85)` 仅视觉调整） | 无 | 地图缩放/罗盘/归属控件 |
| 底图：CARTO Dark Matter | 在线矢量底图样式/瓦片 | CARTO Basemaps Dark Matter（**OSM 派生**） | CARTO（数据源 © OpenStreetMap contributors） | https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json | **需保留署名**（代码已设 `MAP_ATTRIBUTION = '© OpenStreetMap contributors © CARTO'`） | 否（在线引用） | 无（在线加载；另有离线回退纯色背景样式，不含外部瓦片） | 全局地图底图（`src/services/mapConfig.ts`） |
| 演示卫星瓦片：NASA GIBS Himawari-8 TrueColor（**仅 DEMO，`demoOnly`**） | 在线栅格瓦片（WMTS） | NASA GIBS / JMA Himawari-8 真彩 WMTS（演示用途固定时次瓦片） | NASA GIBS / 日本气象厅 JMA | https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_TrueColor/default/2025-07-22T06:00:00Z/250m/{z}/{y}/{x}.jpg | 署名 `NASA GIBS / JMA Himawari-8（演示瓦片）`；正式作品应改为业务化云图服务 | 否（在线引用，演示瓦片） | 无 | DEMO 案例"卫星云图"图层（`satellite`，demoOnly） |

---

## 三、原始只读数据存档（补充，`public/data/raw/`，不入库、不直接渲染）

| asset | type | source | organization | URL | license-usage note | modified? |
| --- | --- | --- | --- | --- | --- | --- |
| `raw/copernicus/dem/Copernicus_DSM_COG_10_*.tif`（13 个瓦片） | GeoTIFF（原始只读） | Copernicus DEM GLO-30 1°×1° COG 瓦片（AWS Open Data） | Copernicus（ESA/EU） | https://registry.opendata.aws/copernicus-dem/ | Copernicus 开放许可，注明来源 | 否 |
| `raw/kontur/kontur_population_CN_20231101.gpkg.gz` | GeoPackage（原始只读） | Kontur Population China 400m H3 | Kontur（via HDX） | https://data.humdata.org/dataset/kontur-population-china | CC BY（Kontur / HDX） | 否 |
| `raw/nmc/yagi-2024-view.json` | JSON（原始只读） | 台风网历史台风 API 原始响应 | 中国气象局台风网（NMC） | http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487 | 官方公开数据，注明来源 | 否 |
| `raw/nsmc/*.JPG`（6）、`raw/nsmc/*.NC`（2） | JPG / NetCDF（原始只读） | FY-4B AGRI 真彩 / SST 官方产品（人工下载） | 国家卫星气象中心（NSMC） | https://satellite.nsmc.org.cn/ 与 https://data.nsmc.org.cn/ | 官方数据，科研与教育用途，注明来源 | 否 |
| `raw/worldpop/README.md` | 说明文档 | 已弃用（WorldPop 中国 100m 约 4.6 GB 下载受限，改用 Kontur） | — | — | 仅保留说明，无数据文件 | 否 |

---

## 四、结论

- **未发现来源不明的素材**：本次扫描范围内，所有 PNG / JPG / GeoJSON / JSON / SVG / 字体 /
  图标 / 底图瓦片均可追溯到明确机构或本项目自建，**无 `BLOCKING_UNKNOWN_SOURCE` 项**。
- 唯一"无来源"项是 `wind-radii.geojson`，但它**不是来源不明**，而是明确标记
  `awaiting-authoritative-data` 的**空占位**（features 为空、未伪造、未插值），符合项目
  "缺失即缺失"铁律，无需标注 BLOCKING。
- 需重点提醒的署名/口径（提交前人工复核）：
  1. FY-4B 六帧 PNG 为**处理后的**重投影+裁剪图像，任何展示不得写成"原始卫星数据"；
  2. SST 展示图层为 NOAA CRW **多源卫星融合日分析场**（非单星瞬时观测），并需注明 Coral Reef Watch / ERDDAP；
  3. 风险四图层为 derived 分析，注意保留"科普型空间分析、非官方风险预报"免责声明；
  4. 两个 schematic GeoJSON 需保留"schematic:true / 机制示意 / 非真实集合预报"标注；
  5. 底图 CARTO Dark Matter 需保留"© OpenStreetMap contributors © CARTO"署名（代码已配置）。
