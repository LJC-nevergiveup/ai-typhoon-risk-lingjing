# 性能审计（Performance Audit）

## 构建产物（`npm run build` 后）

- **dist 总大小：16.6 MB**（已剔除 `public/data/raw/` 原始大文件；剔除前为 598 MB，
  通过 `vite.config.ts` 的构建插件排除，避免把未处理原始数据随作品部署）。
- JS chunks：
  - maplibre 1,053 KB（gzip 284 KB）
  - echarts 482 KB（gzip 161 KB）
  - 应用 index 263 KB（gzip 84 KB）
  - react 11 KB（gzip 4 KB）
  - 合计约 1.81 MB（gzip 约 0.53 MB）
- CSS 89 KB；index.html 0.92 KB。

## 主要数据资源（`public/data/real/yagi-2024/`）

| 资源 | 大小 | 说明 |
| --- | --- | --- |
| FY-4B 卫星帧 PNG × 6 | 1.66–2.61 MB / 帧（合计约 12 MB） | 最大单类资源 |
| NOAA CRW SST PNG × 2 | 0.43–0.47 MB / 帧 | — |
| risk 栅格 PNG × 4 | 6.5–201.6 KB | 很小 |
| grid.json（点击查询网格） | 1.9 MB | 首次加载即取 |
| track / landfalls / 其余 JSON | < 50 KB | — |

## 首次加载评估

首次加载 ≈ 打包 JS/CSS（约 1.9 MB）+ track/landfalls/manifest/sources + grid.json（1.9 MB）+
时间轴最近一帧卫星图（约 2 MB）与 SST（约 0.5 MB），合计约 6–7 MB。主要来自 grid.json
与单帧卫星图，对纯静态科普站点属可接受范围；**科学数值未做任何压缩降质**。

## 已具备 / 可用的优化（不牺牲科学值）

- 大库按 `manualChunks` 拆分（maplibre / echarts / react），利于浏览器缓存。
- risk 四张栅格 PNG 仅在图层开启时加载（图层按需叠加）。
- 卫星 / SST 按时间轴选择“最近一帧”加载，非全量预载。
- 后续可选：grid.json 按需加载或拆分；卫星图转 webp（**禁止压到“明显不可辨认”**）。

## 红线

- 禁止为压缩而改变任何科学数值。
- 禁止把卫星图压到不可辨认。
- 禁止删除 provenance / 来源说明。

## 结论

性能可用，无 P0；主要负载为 grid.json（1.9 MB）与单帧卫星图（约 2 MB），属可接受范围。
