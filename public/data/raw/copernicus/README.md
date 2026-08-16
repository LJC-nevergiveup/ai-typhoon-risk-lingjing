# public/data/raw/copernicus —— Copernicus DEM 原始数据（只读）

## 来源

- 数据集：**Copernicus DEM GLO-30**（欧洲空间局 Copernicus 计划，30 m 全球数字高程模型）
- 下载渠道：AWS Open Data 公开存储桶 `copernicus-dem-30m`（免登录）
  - 瓦片命名：`Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM/Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM.tif`
- 许可：Copernicus 数据开放许可（免费使用，注明来源）

## 本作品使用情况

- 下载 12 个 1°×1° 瓦片（覆盖风险分析 AOI：108.2–111.6°E，18.9–21.2°N）
- 4 个纯海域边缘瓦片在 AWS 桶中不存在（GLO-30 不含海洋瓦片），合并时按 NoData（海域）处理
- 处理脚本：`scripts/prepare_terrain.py`（裁剪 → 重采样 0.01° → 高程分级 → Web PNG）
- 原始高程值未做任何修改

## 铁律

- 原始文件只读；一切处理写入 `risk/terrain/manifest.json` 的 processing。
