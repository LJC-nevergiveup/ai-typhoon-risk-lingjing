# imagery 目录

海表温度（SST）展示图像（NOAA Coral Reef Watch 官方日分析场，经 CoastWatch ERDDAP 下载数据、本地色带渲染，数值未修改）。

- 当前状态：**已接入**，2 帧（2024-09-01、2024-09-05，°C），由 `scripts/import_crw_sst.py` 生成。
- 每个文件的日期、产品、来源链接、数值范围与处理步骤见 `sst/manifest.json` 对应 frame。
- FY-4B AGRI SST 官方观测产品存于 `public/data/raw/nsmc/`（该时次云覆盖、有效像元约 1%，作为观测证据）。
