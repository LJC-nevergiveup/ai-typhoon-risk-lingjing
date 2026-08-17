# Runtime 外部网络依赖审计（Network Dependency Audit）

## 结论

- 核心科学数据（YAGI 轨迹、两次登陆、FY-4B 6 帧、SST 2 帧、DEM、人口、风险四图层、
  AI 工作流、六章节文案）**全部从本地静态文件加载**（`public/data/real/` + 打包进 `dist` 的 JS/CSS），
  不依赖任何后端服务。
- 唯一运行时必需的外部服务是 **天地图底图**（国家地理信息公共服务平台，官方服务，
  需 `VITE_TIANDITU_TOKEN`）；token 缺失或加载失败时自动回退本地纯色背景并提示，
  核心科普数据层仍可渲染，页面不白屏。
- 其余外部 URL 均为**来源外链**（SOURCE_LINK_ONLY），打不开不影响作品主体。

## 分类清单

| 资源 | 域名 | 分类 | 说明 |
| --- | --- | --- | --- |
| 天地图底图（vec_w 矢量 + cva_w 注记） | `t{s}.tianditu.gov.cn` | RUNTIME_EXTERNAL_REQUIRED（token 缺失/失败有离线回退） | 正式背景底图（官方服务）；token 未配置或加载失败时回退本地纯色样式并提示，不白屏 |
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
- **CARTO 已移除**：开发阶段曾使用 CARTO Dark Matter 底图（`basemaps.cartocdn.com`），
  提交前已替换为天地图；正式 REAL 模式运行时不再请求任何 CARTO 域名
  （构建产物 `dist/assets` 中 0 处 `carto`/`cartocdn` 引用），历史记录见
  `docs/competition/map-compliance-audit.md`。
- 底图失败降级见 `src/services/mapConfig.ts`（FALLBACK_MAP_STYLE + 天地图配置）与
  `src/components/TyphoonMap/TyphoonMap.tsx`（token 缺失提示 / 瓦片失败提示）。
