# AGENTS.md — 长期稳定规则（所有 Codex 会话必须遵守）

本文件是项目的“宪法”。以下规则长期有效，任何会话都不得违反；
当前进度、临时结果与下一步任务见 `PROJECT_HANDOFF.md`，不要塞进本文件。

## 1. 项目性质

- 本项目是**面向公众与青少年的交互式台风地理科普网页作品**
  （“首届时空灵境：AI 地理科普行动”参赛作品），不是科研论文网站、不是业务预报系统。
- 技术栈固定：React + Vite + TypeScript + MapLibre GL JS + ECharts + 原生 CSS/CSS Modules。
  不要引入后端、数据库、账号系统、重型 UI 框架、LLM API。
- 部署目标：纯静态托管（GitHub Pages / Vercel），`base: './'` 已配置，不得改为绝对路径。

## 2. 科学性与数据铁律（最高优先级）

1. **禁止编造任何真实数值**（风速、气压、坐标、SST、高程、人口等一律不可虚构）。
2. **DEMO 与 REAL 严格物理隔离**：`public/data/demo/`（合成演示，文件名 `-demo`、`demo:true`）
   与 `public/data/real/`（真实数据）绝不混用；REAL 数据未就绪时必须显示“待接入”，
   **绝不静默回退到 DEMO**。
3. 所有真实数值必须有：机构、产品/数据集名、观测日期时间（UTC）、来源 URL、处理说明
   （见 `docs/competition/data-provenance.md`）。
4. **禁止冒充**：处理后的图像不得称为“原始卫星数据”；机制示意图必须标注
   “机制示意，不代表真实大气分析场”；示意预测路径必须标注“预测不确定性示意，
   非真实集合预报”；空间风险提示必须标注“科普型空间分析，不属于官方灾害风险预报”。
5. **缺失即缺失**：没有权威数据的部分保持占位（`status: awaiting-authoritative-data`），
   禁止插值/反推冒充完整数据（尤其风圈 wind-radii）。
6. 不绕过任何网站的登录/验证码/WAF；官方站点无法获取时，报告阻塞项并改用**有明确机构的
   官方公开来源**，且必须在 sources 与文档中如实记录来源变更。
7. 数值不得为“看起来合理”而人工调整；所有确定性规则（如风险关注分级）写成可审计文本，
   标记 `derived-analysis` + `purpose=science-communication-only`。

## 3. 数据与代码约定

- 数据目录契约见 `public/data/README.md`；数据结构唯一权威是 `src/types/index.ts`。
- UI 不直接 fetch：所有加载经 `src/data/loaders.ts` 的 `loadCase()`；新增数据类型
  先改 types，再写 loader。
- 新增真实台风案例：建立 `public/data/real/<id>/` 数据包 + 在 `src/data/cases.ts`
  注册一条配置，不修改组件。
- 图层管理集中：图层/数据源 id 与样式在 `src/services/layers.ts`，图层面板定义在
  `src/data/layers.ts`，开关表 `LAYER_TOGGLE_MAP` 需同步更新。
- 空间分析一律写成 `scripts/` 下的可复现脚本并输出 QA；禁止手工画风险区域。

## 4. 工程与验证规则

- 每次改动后必须运行：`npm run typecheck` 与 `npm run build`；验证功能时运行
  `npm run dev` 并检查端点。
- `npm run dev` 默认端口 5173；**HMR 不会重挂载只执行一次的 effect**——用户反馈
  “没反应”时，先怀疑陈旧会话：重启 dev server + 让用户 Ctrl+F5。
- 修改数据的导入脚本均含 `--self-test` 或等效自检，且 QA 失败绝不写盘。

## 5. 已知环境坑（本机专属）

- 项目目录 `D:\AI时空灵境` 的磁盘名在 Python 视角是历史编码的乱码形态：
  Python 用 `os.listdir("D:\\")` 扫描识别项目根（含 package.json 的目录）来定位，
  **不要硬编码中文路径**。
- netCDF4/rasterio 等 C 库对含中文路径的文件可能打不开：把文件复制到
  **ASCII 临时目录**（如 `%TEMP%\xxx_work`）处理，再用 PowerShell 复制回项目目录。
- PowerShell 命令行传中文给 `node -e`/`python -c` 会乱码：把脚本写成 UTF-8 文件再执行，
  并设 `$env:PYTHONIOENCODING='utf-8'`。

## 6. 文档与比赛材料

- `docs/competition/ai-creation-log.md` 与 `docs/competition/data-provenance.md`
  是比赛提交材料：每一轮工作、人工核验、发现的问题与修正必须追加记录。
- 每次动真实数据或做新分析后，同步更新 `PROJECT_HANDOFF.md` 的相应章节。
