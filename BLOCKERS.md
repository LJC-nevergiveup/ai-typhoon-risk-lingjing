# BLOCKERS —— 投稿前问题清单

> 结论：代码、数据、科学口径、性能、异常处理均已就绪；唯一硬性 P0 是**地图底图合规需人工核查**。

## P0 投稿前必须解决

| # | 问题 | 说明 | 处置 |
| --- | --- | --- | --- |
| 1 | 地图底图合规（国家版图） | 当前底图为 CARTO Dark Matter（OSM 派生，无中国审图号），台湾/海南/南海诸岛/国界呈现需人工核查 | 见 `docs/competition/map-compliance-audit.md`：人工按自然资源部标准地图核查，或替换为审图号底图（如天地图） |
| 2 | 作者/团队名与正式 URL 待填 | `submission/02_作品说明/作品说明.md` 作者写 `TODO_USER_FILL`；`submission/01_作品/website-link.txt` 待部署后回填 | 人工填写 |

## P1 强烈建议

| # | 问题 | 说明 |
| --- | --- | --- |
| 1 | AI 创作过程截图 | 需从真实 Codex 会话人工补录 2–4 张截图（见 `submission/03_AI创作记录/screenshot-checklist.md`），**勿伪造** |
| 2 | 实际部署并回填 URL | 部署到 Vercel / GitHub Pages 后回填 `website-link.txt`（见 `DEPLOYMENT.md`） |

## P2 Bonus（默认非必须）

| # | 问题 | 说明 |
| --- | --- | --- |
| 1 | CMA-BST 交叉核验 | `tcdata.typhoon.org.cn` WAF 无法程序化下载；轨迹已用同机构台风网官方数据接入，不阻塞 |
| 2 | 完整风圈数据 | 无权威完整风圈序列，作品保持“待接入”，未伪造/未插值 |
| 3 | 官方精确登陆经纬度 | 业务通报仅给地名，坐标用 `geocoded-location` 并明确标注，不冒充官方精确坐标 |
| 4 | 手机/移动端完美适配 | 当前 PC 优先（1366×768 / 1920×1080），移动端为 P2 |

## 已确认无阻塞

- 部署可构建：`npm run build` 通过，`dist` 16.6 MB（已剔除原始大文件）。
- 无来源不明素材（见 `docs/competition/asset-attribution.md`）。
- 关键页面不白屏：底图失败自动回退并提示（见 `docs/competition/network-dependency-audit.md`）。
- 科学数值零改动、派生/示意均有标注（见 `docs/competition/scientific-audit.md`）。
- 默认进入 REAL 案例（YAGI）；DEMO 次级；无 MOCK/TEST/PLACEHOLDER/TODO/DEBUG/localhost 等开发文案。
