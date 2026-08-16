# public/data/raw/kontur —— Kontur 人口原始数据（只读）

## 来源

- 数据集：**Kontur Population — China: Population Density for 400m H3 Hexagons**
  - 文件：`kontur_population_CN_20231101.gpkg.gz`（GeoPackage，EPSG:3857，人口列 population）
- 下载渠道：HDX（Humanitarian Data Exchange）公开数据，免登录
  - URL：https://data.humdata.org/dataset/kontur-population-china
- 发布版：2023-11-01；人口基础约 2020 年；输入含 GHSL/WorldPop 等开源数据
- 许可：CC BY（Kontur / HDX）

## 使用原因

WorldPop 中国 2020 年 100m 文件完整大小为 4.6 GB，下载受限；Kontur 400m 数据量小且可
按 bbox 过滤读取，适合本作品 AOI（海南北部—琼州海峡—雷州半岛）。

## 处理

- `scripts/prepare_population.py`：按 AOI bbox（EPSG:3857）过滤读取 → 六边形质心归入
  0.01° 网格求和 → 密度（人/km²）→ Web PNG；人口数值未修改。

## 铁律

- 原始文件只读；处理写入 `risk/population/manifest.json` 的 processing。
- 仅表达人口暴露（exposure），不表达伤亡风险。
