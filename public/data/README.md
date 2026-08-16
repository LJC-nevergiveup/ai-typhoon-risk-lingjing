# public/data 数据目录约定

本目录存放**静态地理数据**，通过 `src/data/loaders.ts` 以 `fetch` 方式加载。

## 目录约定

- `demo/` —— 仅用于界面与流程验证的合成演示数据，文件名一律带 `-demo` 后缀，
  数据内部带有 `demo: true` 标记。**禁止**在正式作品中引用。
- `raw/` —— 权威数据集的**原始文件**（只读），由导入脚本解析：
  - `raw/nmc/yagi-2024-view.json` —— 台风网官方历史台风 API 原始响应
    → `scripts/import-nmc-track.ts` → `real/yagi-2024/track.geojson`（已接入）
  - `raw/cma/CH2024BST.txt` —— CMA-BST 最佳路径原始文件（待获取，用于交叉核验）
    → `scripts/import-cma-best-track.ts`
- `real/<案例id>/` —— 真实台风案例数据包，每个案例目录包含：
  - `manifest.json` —— 案例清单：id、数据状态（status）、文件映射
  - `track.geojson` —— 真实轨迹点
  - `landfalls.geojson` —— 登陆点
  - `wind-radii.geojson` —— 风圈多边形（允许缺失）
  - `sources.json` —— 权威数据来源清单（primary / cross-validation 角色）

## 真实数据接入铁律

1. **没有权威真实原始数据时，禁止编造数值**。占位文件的 `status` 必须为
   `awaiting-authoritative-data`，`features` 保持为空。
2. 只有当数据经过权威来源核对录入后，才允许把 `status` 改为 `available`。
3. 前端在 `status` 非 `available` 时显示“真实数据待接入”，**绝不静默回退到 DEMO**。
4. 字段名与类型以 `track.geojson` / `landfalls.geojson` 文件内的 `schema` 说明为准，
   与 `src/types/index.ts` 保持一致。

## 计划中的其他数据类型（后续阶段）

| 目录 / 文件 | 内容 | 格式 |
| --- | --- | --- |
| SST | 海表温度场 | 栅格瓦片 / NetCDF 前端解析 |
| 卫星云图 | 静止气象卫星云图 | 栅格瓦片（WMS/WMTS） |
| DEM | 数字高程模型 | 栅格瓦片 / Terrain-RGB |
| 人口数据 | 人口密度格网 | 栅格瓦片 / 分级 GeoJSON |
| 风险区 | 综合风险分区面 | GeoJSON |
| 避险点 | 应急避难场所点 | GeoJSON |

## 数据与代码分离原则

- 数据文件不参与打包，运行时通过 `import.meta.env.BASE_URL + 'data/...'` 加载，
  保证部署到 GitHub Pages 子路径时路径仍然正确。
- 数据字段结构见 `src/types/index.ts`；新增数据时先更新类型，再写 loader。
- 新增真实台风案例：建立 `real/<id>/` 数据包 + 在 `src/data/cases.ts` 注册一条配置，
  无需修改任何组件。
