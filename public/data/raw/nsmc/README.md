# public/data/raw/nsmc —— 国家卫星气象中心原始资料（只读，需人工下载）

## 用途

存放从**风云卫星遥感数据服务网**人工下载的 FY-4B 官方产品原始文件，
由 `scripts/import-nsmc-environment.ts` 整理为前端可用的 `environment/` 数据包。

## 需要人工下载的资料（本轮清单）

> 风云卫星遥感数据服务网（https://satellite.nsmc.org.cn/ ）的数据检索与下载
> **必须注册并登录**。本项目遵守站点安全要求，**不绕过登录、不使用爬虫**。
> 请人工登录后下载以下文件并放入本目录。

### 1. 卫星云图（4–6 个代表时刻，推荐产品：AGRI真彩图像 全圆盘 1000M）

推荐产品（风云卫星遥感数据服务网产品清单）：
- **AGRI真彩图像(全圆盘) FY4B / AGRI / IMG / 1000M**（首选，单帧约 10.7 MB，真彩直观）
- 备选：AGRI云图像(全圆盘) 4000M（单帧约 0.48 MB，云检测图，非真彩）

建议时刻（以实际可获得的官方产品为准，不必凑满）：

| 阶段 | 建议 UTC 时刻（YAGI） | 用途 |
| --- | --- | --- |
| 生成 | 2024-09-01 00:00 前后 | 初始热带低压云系 |
| 发展 | 2024-09-03 00:00 前后 | 加强为台风前后 |
| 进入南海 | 2024-09-04 00:00 前后 | 进入南海东北部 |
| 快速增强/强盛 | 2024-09-05 06:00 前后 | 超强台风巅峰 |
| 登陆前 | 2024-09-06 06:00 前后 | 登陆海南前 |

文件要求：
- 产品：AGRI 真彩图像（全圆盘，1000M，IMG 产品）；覆盖区域包含 105–140°E、5–30°N
  （全圆盘为标称投影；若能裁剪/重投影到上述区域最好，否则原图放入并如实登记，
  前端按“标称投影、未重投影”口径近似叠加）
- 保存到 `raw/nsmc/satellite/`，文件名建议：`fy4b_agri_202409010000.<ext>`
- 若需裁剪/导出，请保留原图，处理说明写入 frames 索引

### 2. 海表温度 SST（1–2 个代表日期，推荐产品：FY-4B AGRI SST）

推荐产品：
- **FY-4B AGRI 海表温度（SST）L2 产品（4KM）**：若为 HDF 数值产品，需本地按官方数值
  渲染出图（processing 记录 "color-mapped from official L2 values"）
- 若产品清单存在 **SST 图像（IMG）版**，优先下载图像版

建议日期（以实际可获得的官方产品为准）：

| 日期 | 用途 |
| --- | --- |
| 2024-09-01 前后 | YAGI 生成时的海洋热力背景 |
| （可选）2024-09-05 前后 | 登陆前的海温背景 |

文件要求：
- 产品：FY-4B AGRI SST（单位 °C），保存到 `raw/nsmc/sst/`
- 色带/图例信息写入 frames 索引（legend 字段）

### 3. 索引文件

下载完成后，在本目录创建 `raw/nsmc/frames.json`，结构见
`scripts/import-nsmc-environment.ts` 顶部注释（satellite 与 sst 两个数组，
含 id/timestamp 或 date/bbox/sourceUrl/caption/processing 等字段）。

## 导入命令

```bash
python scripts/import_fy4b_env.py        # 卫星真彩：标称网格→EPSG:4326 重投影 + 裁剪 + manifest
python scripts/import_crw_sst.py         # SST 展示层：CRW 数据本地色带渲染 + manifest
```

## 铁律

- 原始文件只读；处理（重投影/裁剪/色带/格式转换）必须在各帧 processing 中如实记录，
  处理后的图像不得描述为“原始卫星数据”。
- 未取得官方文件前，environment 两个 manifest 保持 `awaiting-authoritative-data`，
  前端显示“真实资料待接入”，绝不使用演示图或第三方图冒充。

## 当前状态（2026-08-16 更新：已下载完成 ✓）

- **卫星云图**：6 帧 FY-4B AGRI 真彩（GCLR）JPG（2024-09-01 00:00 — 09-06 06:00 UTC，1000M 全圆盘）
  → 已处理为 105–140°E、5–30°N 等经纬度 PNG，environment/satellite/manifest.json = available
- **SST**：2 个 FY-4B AGRI SST L2 NetCDF（2024-09-01、09-05，4KM 全圆盘，°C）
  → 该时次区域内高质量像元仅约 1%（台风云系覆盖），保留为观测证据（区域均值 28.8/28.4 °C）
- **SST 展示图层**：使用 NOAA Coral Reef Watch 官方日分析场（经 CoastWatch ERDDAP 下载数据、
  本地渲染），environment/sst/manifest.json = available；来源与口径见 environment/sources.json
