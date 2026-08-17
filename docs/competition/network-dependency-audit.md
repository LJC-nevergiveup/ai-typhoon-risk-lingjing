# Runtime 外部网络依赖审计（Network Dependency Audit）

## 结论

- 核心科学数据（YAGI 轨迹、两次登陆、FY-4B 6 帧、SST 2 帧、DEM、人口、风险四图层、
  AI 工作流、六章节文案）**全部从本地静态文件加载**（`public/data/real/` + 打包进 `dist` 的 JS/CSS），
  不依赖任何后端服务。
- 唯一运行时必需的外部服务是 **CARTO 底图**；已加入本地离线回退（底图失败 → 纯色背景，
  核心科普数据层仍可渲染，页面不白屏）。
- 其余外部 URL 均为**来源外链**（SOURCE_LINK_ONLY），打不开不影响作品主体。

## 分类清单

| 资源 | 域名 | 分类 | 说明 |
| --- | --- | --- | --- |
| CARTO Dark Matter 底图 | `basemaps.cartocdn.com` | RUNTIME_EXTERNAL_REQUIRED（有离线回退） | 背景底图；失败时回退本地纯色样式并提示 |
| NASA GIBS 演示卫星瓦片 | `gibs.earthdata.nasa.gov` | RUNTIME_EXTERNAL_OPTIONAL（仅 DEMO） | 仅 DEMO 案例加载；REAL 模式不加载（已按 `kind==='demo'` 守卫） |
| 中国气象局台风网 | `typhoon.nmc.cn` | SOURCE_LINK_ONLY | 轨迹来源外链 |
| 中央气象台登陆通报 | `hainan.gov.cn` / `weather.com.cn` / `cnr.cn` | SOURCE_LINK_ONLY | 两次登陆数值来源外链 |
| CMA-BST / IBTrACS / JMA | `tcdata.typhoon.org.cn` / `ncei.noaa.gov` / `jma.go.jp` | SOURCE_LINK_ONLY | 交叉核验（未实际接入） |
| FY-4B | `satellite.nsmc.org.cn` / `data.nsmc.org.cn` | SOURCE_LINK_ONLY | 卫星/SST 来源外链 |
| NOAA Coral Reef Watch | `coastwatch.noaa.gov` | SOURCE_LINK_ONLY | SST 展示层来源外链 |
| Copernicus DEM | `registry.opendata.aws` | SOURCE_LINK_ONLY | DEM 来源外链 |
| Kontur Population | `data.humdata.org` | SOURCE_LINK_ONLY | 人口来源外链 |
| React / MapLibre / ECharts | npm（本地 bundle） | LOCAL | 已打包进 `dist/assets` |
| 字体 | 系统字体栈 | LOCAL | 无 Google Fonts / 在线字体 |
| 图标 | `favicon.svg` + emoji | LOCAL | 无在线图标 CDN |

## 说明

- 来源 URL 均以 `<a target="_blank">` 形式出现在信息面板“数据来源 / 环境观测资料 /
  风险分析数据来源”卡片中，仅作为可审计证据链接，不是运行时依赖。
- 底图失败降级见 `src/services/mapConfig.ts`（FALLBACK_MAP_STYLE）与
  `src/components/TyphoonMap/TyphoonMap.tsx`（error → 本地回退 + 提示条）。
