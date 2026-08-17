# BLOCKERS —— 投稿前问题清单

> 结论：代码、数据、科学口径、性能、异常处理均已就绪；底图已从 CARTO 切换为天地图（官方服务）。
> 剩余 P0 均为**需人工完成**的提交必需项（截图、URL、作者信息、最终地图人工检查）。

## P0 投稿前必须解决（SUBMISSION_REQUIRED / MANUAL_REVIEW）

| # | 问题 | 说明 | 处置 |
| --- | --- | --- | --- |
| 1 | 地图底图合规（最终人工检查） | 底图已替换为天地图（国家地理信息公共服务平台，官方服务）；参赛者仍需按赛事规范人工检查国界/台湾/海南/南海诸岛/署名显示 | 见 `docs/competition/map-compliance-audit.md` 人工检查清单；未取得正式证明前不宣称“已通过审核” |
| 2 | **AI 创作记录截图 ≥2 张（真实）** | 比赛提交材料明确要求 AI 创作记录包含生成过程截图；`submission/03_AI创作记录/screenshots/` 当前为空 | **P0 SUBMISSION_REQUIRED**：人工从真实 Codex 会话补录至少 2 张（建议 4 张候选，见 screenshot-checklist.md），**勿伪造** |
| 3 | **正式公网部署 URL** | 交互作品需要可访问的网页地址 | **P0 SUBMISSION_REQUIRED**：按 `DEPLOYMENT.md` 部署到 Vercel / GitHub Pages 后回填 `submission/01_作品/website-link.txt`，**勿填虚假 URL** |
| 4 | 作者/团队信息 | `submission/02_作品说明/作品说明.md` 作者为 `TODO_USER_FILL` | 人工填写（不要猜） |

## P1 强烈建议

| # | 问题 | 说明 |
| --- | --- | --- |
| 1 | 天地图 token 申请与配置 | 部署/运行时设置 `VITE_TIANDITU_TOKEN`（申请见 `.env.example` 与 `DEPLOYMENT.md`）；未配置时底图降级为纯色背景并提示，核心数据不受影响 |
| 2 | 部署后回填 `website-link.txt` | 随 P0-3 完成 |

## P2 Bonus（默认非必须）

| # | 问题 | 说明 |
| --- | --- | --- |
| 1 | CMA-BST 交叉核验 | tcdata WAF 无法程序化下载；轨迹已用同机构台风网官方数据接入，不阻塞 |
| 2 | 完整风圈数据 | 无权威完整风圈序列，保持“待接入”，未伪造/未插值（03 章文案已如实说明） |
| 3 | 官方精确登陆经纬度 | 业务通报仅给地名，坐标用 `geocoded-location` 并明确标注 |
| 4 | 手机/移动端完美适配 | 当前 PC 优先（1366×768 / 1920×1080） |

## 已确认无阻塞

- 构建可部署：`npm run build` 通过，`dist` 约 16.6 MB（已剔除原始大文件；**含 0 处 CARTO 引用**）。
- 正式底图 = 天地图官方服务；CARTO 已彻底退出正式 runtime（历史文档保留真实记录）。
- 底图 token 缺失/失败：自动回退本地纯色样式并提示，不白屏、不无限 loading、无 stack trace。
- 无来源不明素材（见 `docs/competition/asset-attribution.md`）。
- 科学数值零改动、派生/示意均有标注（见 `docs/competition/scientific-audit.md`）。
- 默认进入 REAL 案例（YAGI）；DEMO 次级；无 MOCK/TEST/PLACEHOLDER/TODO/DEBUG/localhost 等开发文案。
- 03 章风圈文案已改为“未取得完整可追溯历史风圈时序，不使用推算或插值风圈”，与真实数据状态一致。
