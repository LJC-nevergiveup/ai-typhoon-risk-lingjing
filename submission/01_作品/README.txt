AI 台风风险灵境 · 和 AI 一起追“风”去
=========================================

这是什么
--------
面向公众与青少年的交互式台风地理科普网页（“首届时空灵境：AI 地理科普行动”参赛作品）。
主案例：2024 年第 11 号台风“摩羯”（YAGI，2411）——真实轨迹、两次登陆、环境观测与科普型空间关注提示，
全部来自可追溯的公开数据。

如何打开
--------
1. 在浏览器打开同目录 website-link.txt 中填写的正式访问 URL；
2. 推荐 Chrome / Edge（最新版），分辨率 1366×768 或 1920×1080；
3. 点击“开始追风”，按 01–06 顺序浏览六章节，使用底部时间轴、图层开关与地图点击查询。

核心文件指向（源码仓库内）
--------------------------
- 作品代码：src/（React 19 + Vite 7 + TypeScript + MapLibre GL JS 5 + ECharts 5 + 原生 CSS）
- 章节文案：src/data/chapters.ts
- 真实数据包：public/data/real/yagi-2024/
  （轨迹 track.geojson、登陆 landfalls.geojson、卫星/SST environment/、风险 risk/、示意 schematic/、来源 sources.json）
- 数据来源：public/data/real/yagi-2024/sources.json 及各子目录 sources.json
- 比赛材料：docs/competition/（ai-creation-log.md、data-provenance.md）

运行与操作说明详见 submission/05_运行说明/README.md。
