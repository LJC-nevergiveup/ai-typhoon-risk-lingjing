# public/data 数据目录约定

本目录存放**静态地理数据**，通过 `src/data/loaders.ts` 以 `fetch` 方式加载。

## 目录约定

- `demo/` —— 仅用于界面与流程验证的合成演示数据，文件名一律带 `-demo` 后缀，
  数据内部带有 `demo: true` 标记。**禁止**在正式作品中引用。
- `raw/` —— 权威数据集的**原始文件**（只读；二进制文件不入库，见 .gitignore）：
  - `raw/nmc/yagi-2024-view.json` —— 台风网官方历史台风 API 原始响应
    → `scripts/import-nmc-track.ts` → `real/yagi-2024/track.geojson`（已接入）
  - `raw/cma/CH2024BST.txt` —— CMA-BST 最佳路径原始文件（待获取，仅用于交叉核验，不阻塞案例）
    → `scripts/import-cma-best-track.ts`
  - `raw/nsmc/` —— FY-4B AGRI 真彩图像 / SST L2 官方产品（人工下载）
    → `scripts/import_fy4b_env.py` / `import_crw_sst.py` → `real/yagi-2024/environment/`
  - `raw/copernicus/dem/` —— Copernicus DEM GLO-30 瓦片 → `scripts/prepare_terrain.py`
  - `raw/kontur/` —— Kontur Population 400m H3 → `scripts/prepare_population.py`
  - `raw/worldpop/` —— 已弃用（4.6 GB 下载受限），仅保留说明
- `real/<案例id>/` —— 真实台风案例数据包：
  - `manifest.json` —— 案例清单：id、数据状态（status）、文件映射、描述
  - `track.geojson` / `landfalls.geojson` / `wind-radii.geojson`（风圈允许缺失占位）
  - `sources.json` —— 权威数据来源清单（historical-track / operational-bulletin 分口径）
  - `environment/` —— 环境观测资料（satellite 卫星云图、sst 海温，各含 manifest + imagery）
  - `risk/` —— 科普型空间关注提示（terrain / population / proximity / attention 四图层
    + grid.json 点击查询 + sources.json + aoi.json 规则）
  - `schematic/` —— 机制示意图层（schematic:true，非真实分析场）

## 真实数据接入铁律

1. **没有权威真实原始数据时，禁止编造数值**。占位文件的 `status` 必须为
   `awaiting-authoritative-data`，`features` 保持为空（见 wind-radii.geojson）。
2. 只有当数据经过权威来源核对录入后，才允许把 `status` 改为 `available`。
3. 前端在 `status` 非 `available` 时显示“真实数据待接入”，**绝不静默回退到 DEMO**。
4. 字段名与类型以各 geojson 文件内的 `schema` 说明与 `src/types/index.ts` 为准。

## 已实现数据类型

| 类型 | 目录 / 文件 | 说明 |
| --- | --- | --- |
| 历史轨迹 | real/yagi-2024/track.geojson | 台风网官方历史数据（36 时次） |
| 登陆事件 | real/yagi-2024/landfalls.geojson | 中央气象台业务通报（2 次） |
| 风圈 | real/yagi-2024/wind-radii.geojson | 占位（awaiting-authoritative-data，未伪造） |
| 卫星云图 | real/yagi-2024/environment/satellite/ | FY-4B AGRI 真彩（6 帧） |
| 海表温度 | real/yagi-2024/environment/sst/ | NOAA CRW 日分析场（2 帧） |
| 地形 | real/yagi-2024/risk/terrain/ | Copernicus GLO-30 分级 |
| 人口暴露 | real/yagi-2024/risk/population/ | Kontur 400m H3 密度 |
| 路径邻近度 | real/yagi-2024/risk/proximity/ | NMC 轨迹最小测地距离（derived） |
| 空间关注提示 | real/yagi-2024/risk/attention/ | 三因子确定性规则（derived-analysis） |
| 机制示意 | real/yagi-2024/schematic/ | 引导气流 / 预测不确定性（schematic:true） |

## 数据与代码分离原则

- 数据文件不参与打包，运行时通过 `import.meta.env.BASE_URL + 'data/...'` 加载，
  保证部署到 GitHub Pages 子路径时路径仍然正确。
- 数据字段结构见 `src/types/index.ts`；新增数据时先更新类型，再写 loader。
- 新增真实台风案例：建立 `real/<id>/` 数据包 + 在 `src/data/cases.ts` 注册一条配置，
  无需修改任何组件。
- 空间分析脚本位于 `scripts/`，可复现、含自检；禁止手工画风险区域。
