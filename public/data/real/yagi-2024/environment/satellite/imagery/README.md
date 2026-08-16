# imagery 目录

真实卫星图像文件（FY-4B AGRI 真彩 GCLR 官方产品，经标称网格→EPSG:4326 重投影与区域裁剪）。

- 当前状态：**已接入**，6 帧（2024-09-01 00:00 — 09-06 06:00 UTC），由 `scripts/import_fy4b_env.py` 生成。
- 每个文件的观测时刻、卫星/仪器/产品、来源链接与全部处理步骤见 `satellite/manifest.json` 对应 frame。
- 原始产品存于 `public/data/raw/nsmc/`（只读）；处理后的图像不得描述为“原始卫星数据”。
