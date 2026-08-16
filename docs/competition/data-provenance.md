# 数据来源追溯（Data Provenance）

> 作品：AI 台风风险灵境 · 和 AI 一起追“风”去
> 原则：所有真实数值必须有机构、产品名称、观测日期/时间（UTC）、来源链接与处理说明；DEMO 数据与真实数据严格物理隔离；无权威数值时留空，禁止编造。

---

## 1. 轨迹（track）

| 项 | 内容 |
| --- | --- |
| 机构 | 中国气象局台风网（typhoon.nmc.cn） |
| 数据集 | 台风网历史台风数据（最佳路径分析），台风 id 3275487（YAGI，2411） |
| 原始文件 | `public/data/raw/nmc/yagi-2024-view.json`（API 原始 JSONP，只读，2026-08-15 获取） |
| 生成方式 | `scripts/import-nmc-track.ts`（解析 JSONP、等级映射、时间戳往返校验、epoch 交叉校验、QA 全项通过才写盘） |
| 生成产物 | `public/data/real/yagi-2024/track.geojson`（36 个时次，status=available） |
| 关键数值 | 2024-09-01T00:00Z — 09-08T12:00Z；12.2–21.9°N、103.6–126.2°E；13–62 m/s；915–1004 hPa；3 小时加密记录 10 条；0 缺失/重复/非法 |
| 交叉核验 | 峰值 62 m/s / 915 hPa 与中央气象台业务通报及公开报道一致 |
| 备注 | tcdata.typhoon.org.cn（CMA-BST，CH2024BST.txt）受 WAF 保护暂未获取；取得后经 `scripts/import-cma-best-track.ts` 交叉核验 |

## 2. 登陆点（landfalls）

| 项 | 第 1 次登陆 | 第 2 次登陆 |
| --- | --- | --- |
| 地点 | 海南省文昌市翁田镇沿海 | 广东省湛江市徐闻县角尾乡沿海 |
| 时间 | 2024-09-06T08:20:00Z（北京 16:20） | 2024-09-06T14:20:00Z（北京 22:20） |
| 强度 | 超强台风级（17级以上） | 超强台风级（17级） |
| 风速 / 气压 | 62 m/s / 915 hPa | 58 m/s / 925 hPa |
| 来源类型 | operational-bulletin（中央气象台台风快讯） | operational-bulletin（广东省气象台消息） |
| 原文出处 | 海南省政府网（海南日报）、[央广网海南频道](https://www.cnr.cn/hn/jrhn/20240906/t20240906_526891112.shtml)：“登陆时中心附近最大风力17级以上（62米/秒），中心最低气压915hPa” | [中国天气网](https://qq.weather.com.cn/news/2024/09/3872661.shtml)、[央广网](http://news.cnr.cn/rebang/20240906/t20240906_526891685.shtml)：“登陆时中心附近最大风力17级（58米/秒），中心最低气压925百帕”；海南省气象局页面标题同证 |
| 坐标 | geocoded-location：翁田镇 19.93271°N, 110.87503°E（维基百科行政区划坐标，仅可视化，非官方登陆坐标） | geocoded-location：角尾乡 20.26284°N, 109.95327°E（同上） |
| 处理说明 | 无数值修改；数值按官方原文逐字录入 | 无数值修改 |

## 3. 环境观测资料（environment）—— 已接入

### 卫星云图（environment/satellite，6 帧，status=available）

| 项 | 内容 |
| --- | --- |
| 机构 | 国家卫星气象中心（NSMC/CMA）风云卫星遥感数据服务网（人工登录下载） |
| 产品 | FY-4B AGRI 真彩图像（GCLR）L2 · 全圆盘 1000M（N_DISK_1050E 标称网格） |
| 时刻（UTC） | 2024-09-01/02/03/04 00:00、09-05 06:00、09-06 06:00（各帧覆盖生成→发展→进入南海→快速增强→登陆前） |
| 原始文件 | `public/data/raw/nsmc/*.JPG`（只读） |
| 处理 | `scripts/import_fy4b_env.py`：圆盘边缘实测定标（扫描角采样 5.78″/px，与 1000M 标称一致）→ 标准静止卫星前向投影重采样到 EPSG:4326 → 裁剪 105–140°E、5–30°N → PNG；气象数值未修改 |
| 几何验证 | 地物颜色特征（海南岛陆地暖色、台湾海峡深蓝）与台风眼定位（09-05/09-06 眼区距轨迹点 ≤0.5°）双项通过 |

### 海表温度（environment/sst，2 帧，status=available）

| 项 | 内容 |
| --- | --- |
| 展示图层来源 | NOAA Coral Reef Watch Daily Global 5km SST（CoralTemp，°C，1985–至今），经 NOAA CoastWatch ERDDAP 公开接口下载数据（CSV，免登录），`scripts/import_crw_sst.py` 本地色带渲染，数值未修改 |
| 日期与数值 | 2024-09-01：25.5–31.9°C（区域平均 30.2°C）；2024-09-05：25.6–32.4°C（区域平均 30.0°C） |
| 观测证据 | FY-4B AGRI SST L2（用户下载，`raw/nsmc/*.NC`）：该时次区域内高质量像元仅约 1%（台风云系覆盖），有效像元均值 28.8/28.4°C，与展示分析场量级一致；作为观测证据保留 |
| 处理 | 网格整理、色带映射（蓝→红，值域按帧）、陆地/无效灰化；未插值、未修改数值 |

## 4. 风险分析（risk，科普型空间风险提示）

| 因子 | 来源（原始数据） | 年份/分辨率 | 处理 |
| --- | --- | --- | --- |
| 地形/低海拔 | Copernicus DEM GLO-30（AWS Open Data，13 瓦片） | 30 m | 海岸线掩膜（Natural Earth 110m）→ 重采样 0.01° → 分级 0-5/5-10/10-30/>30 m；高程未修改 |
| 人口暴露 | Kontur Population 400m H3（HDX 公开；WorldPop 中国 100m 为 4.6GB 下载受限故改用） | 发布 2023（人口基础约 2020）/ 400m | bbox 过滤（EPSG:3857）→ 质心归入 0.01° 网格求和 → 密度 人/km²；数值未修改 |
| 路径邻近度 | NMC 台风网历史轨迹（36 点） | — | derived-analysis：WGS84 球面最小交叉航迹距离（方法见 proximity-summary.json） |
| 空间关注提示 | 三因子组合 | — | derived-analysis：确定性规则（见 risk/aoi.json 与 attention-summary.json），purpose=science-communication-only |

- 综合规则：highCount≥2 → 重点关注；highCount==1 或 medCount≥2 → 较高关注；其余 → 一般关注（海域不计地形与人口条件）。未做权重调参。
- 点击查询：前端从 grid.json（0.01° 查找网格）读取高程/人口密度/距离/分级，并始终显示免责声明。
- 所有图层与查询结果均标记“科普型空间分析，不属于官方灾害风险预报”。

## 5. 机制示意（schematic，02 章节）

- `schematic/steering-schematic.geojson`：副热带高压椭圆 + 引导气流 + 转向气流——**纯科普示意**，
  文件内与图层图例、弹窗均标注“机制示意，不代表 YAGI 当时真实大气分析场”。
- `schematic/forecast-uncertainty-schematic.geojson`：三条示意可能路径——**预测不确定性示意**，
  标注“非真实集合预报，不构成任何预报结论”。
- 未使用任何真实副高分析场或集合预报数据（本轮禁止新增此类数据集）。

## 6. 尚未接入的权威数据

1. 风圈（wind-radii.geojson，允许 sparse 观测，禁止插值冒充官方完整序列）
2. CMA-BST 原始文件（CH2024BST.txt，tcdata WAF 未解，用于轨迹交叉核验）
3. 两次登陆的官方精确经纬度（现为地理编码坐标）

## 5. DEMO 数据隔离说明

- 全部演示数据位于 `public/data/demo/`：合成轨迹（文件名 `-demo`、`demo: true`）、风险区示意、避险点示意。
- 前端任何模式均不将 DEMO 数据用作 REAL 数据；REAL 数据未就绪时明确显示“待接入”，无静默回退。
