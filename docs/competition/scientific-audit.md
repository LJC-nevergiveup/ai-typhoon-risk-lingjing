# 用户可见科学性全文审计（Scientific Audit）

> 方法：全文检索 src/ 与 public/data/real/ 中的用户可见文案，逐条核对“claim / location /
> type / source-evidence / status”。status 取值：verified（有权威来源）、qualified（有来源但带限定）、
> derived（派生分析，已标注）、illustrative（示意，已标注）、manual-review（需人工复核）。

## 逐条清单

| claim | location | type | source/evidence | status | notes |
| --- | --- | --- | --- | --- | --- |
| 台风多生成于西北太平洋/南海热带洋面；赤道附近难生成（地转偏向力） | chapters 01 | 科学知识 | 标准气象学知识 | verified | 通用科普，无绝对化 |
| 海温通常需高于 26.5℃ 供能 | chapters 01 | 科学知识 | 标准气象学知识 | qualified | 用“通常”，非绝对 |
| YAGI 轨迹 36 时次、13–62 m/s、915–1004 hPa、09-01–09-08 | track.geojson / manifest | 真实数据 | 中国气象局台风网官方历史数据 | verified | 数值零改动 |
| 两次登陆：文昌 08:20Z 62 m/s/915 hPa；徐闻 14:20Z 58 m/s/925 hPa | landfalls.geojson / InfoPanel | 真实数据 | 中央气象台业务通报原文 | verified | 数值有原文出处 |
| 登陆坐标 = 地名地理编码（geocoded-location），非官方精确坐标 | landfalls.geojson / Popup / InfoPanel | 数据口径 | 维基百科行政区划坐标 + 显式声明 | qualified | 明确不冒充官方精确坐标 |
| FY-4B AGRI 真彩卫星云图 6 帧（卫星观测） | satellite manifest / EnvironmentStatus | 真实数据 | 国家卫星气象中心官方产品（人工下载） | verified | 处理后图像，未称“原始” |
| SST 为 NOAA Coral Reef Watch 日分析场（多源卫星融合，非单星瞬时观测） | sst manifest / EnvironmentStatus | 真实数据 | NOAA CRW via ERDDAP | verified | 已明确 L4/分析场性质、日期、单位 °C |
| 地形低洼分级（0–5 / 5–10 / 10–30 / >30 m） | terrain manifest | derived | Copernicus DEM GLO-30 | verified | 原始高程未修改 |
| 人口暴露（人/km²） | population manifest | derived | Kontur Population 400m H3 | verified | 明确 exposure ≠ 伤亡 |
| 路径邻近度 ≠ 风圈 / 风速影响范围 | proximity manifest / UI | derived | NMC 轨迹最小测地距离 | qualified | 反复声明，不冒充风圈 |
| 空间关注提示 = 科普型空间分析，非官方灾害风险预报 | attention manifest / aoi.json / UI | derived | 三因子确定性规则 | derived | 反复声明“以官方预警为准” |
| “低于某一高程一定会被淹没”并不成立 | InfoPanel 04 | 科学限定 | 气象常识 | qualified | 正确否定绝对化表述 |
| 人口暴露不代表伤亡风险 | InfoPanel / aoi.json | 科学限定 | 概念界定 | qualified | 正确 |
| 机制示意图：非真实大气分析场 | schematic / InfoPanel 02 | illustrative | 自建示意 | illustrative | 三处以上标注 |
| 预测不确定性示意：非真实集合预报 | schematic / InfoPanel 02 | illustrative | 自建示意 | illustrative | 三处以上标注 |
| 风圈缺失：未伪造、未插值，待接入 | wind-radii.geojson / manifest | 数据状态 | 无权威完整风圈数据 | verified | 诚实占位 |
| AI 辅助 ≠ AI 自主得出结论（nmcFlagRaw 案例） | InfoPanel 05 | 方法论 | 真实审计记录 | qualified | 有真实案例支撑 |
| 防灾避险以气象/应急部门官方预警为准 | InfoPanel 06 / 收尾语 | 免责 | — | qualified | 反复声明 |

## 检索敏感词结果

- “预测”：均出现在“路径预测（气象部门滚动发布）”“预测不确定性示意（非真实集合预报）”，
  无“AI 正在预测 YAGI”类表述。✔
- “精确 / 精准”“官方风险”“最安全 / 最危险”“伤亡预测”“实时”：**全文未出现**。✔
- “一定”：仅出现在“低于某一高程一定会被淹没并不成立”的否定句中。✔

## 结论

未发现需要 manual-review 的科学表述；所有真实数值有来源、派生结果有标注、示意内容有声明。
