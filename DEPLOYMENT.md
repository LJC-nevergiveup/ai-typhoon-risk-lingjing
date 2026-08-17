# 部署说明（DEPLOYMENT）

本作品为**纯静态站点**，无后端、无数据库。`vite.config.ts` 已设 `base: './'`（相对路径，
适配 GitHub Pages 项目页子路径 / Vercel 根路径；无绝对根路径 `/data/...` 引用）。

## 当前部署状态（2026-08-17）

- **正式平台：GitHub Pages**（Vercel 因账号验证暂不可用）
- 仓库：`https://github.com/LJC-nevergiveup/ai-typhoon-risk-lingjing`（分支 `master`）
- 预期站点：`https://ljc-nevergiveup.github.io/ai-typhoon-risk-lingjing/`
- **状态：已部署**（正式 URL 已回填 `submission/01_作品/website-link.txt`；部署日期 / production commit 由作者补充）
- Build Command：`npm run build`（内部含 `tsc --noEmit`）；Install：`npm ci`；Output：`dist`
- 环境变量：`VITE_TIANDITU_TOKEN`（GitHub Actions 中通过 **secret** 注入）
- Production URL：`https://ljc-nevergiveup.github.io/ai-typhoon-risk-lingjing/`

## 天地图 token

正式底图使用国家地理信息公共服务平台“天地图”（官方服务）：

1. 注册 https://console.tianditu.gov.cn/ ，创建“浏览器端”应用获取 tk（免费）。
2. 本地开发：复制 `.env.example` 为 `.env` 填入 `VITE_TIANDITU_TOKEN`（`.env` 已被 .gitignore 排除，不入库）。
3. GitHub Actions 部署：**不要写进源码/workflow**，而是添加到仓库
   **Settings → Secrets and variables → Actions → New repository secret**，Name=`VITE_TIANDITU_TOKEN`，
   Value=tk；workflow 通过 `${{ secrets.VITE_TIANDITU_TOKEN }}` 注入。
4. 说明：这是 Vite 浏览器端变量，构建后会出现在客户端 bundle 中（天地图官方设计）；
   secret 的作用是避免把 token 提交到源码，不是把它变成服务端秘密。
   部署完成后建议在天地图控制台把 key 限制到正式域名来源。
5. 未配置 token 时页面自动降级为纯色背景并提示“正式底图服务尚未配置，核心科普数据仍可浏览。”，不白屏。

## 方案 A：GitHub Pages（正式，推荐）

1. 把本目录推送到 GitHub 仓库 `LJC-nevergiveup/ai-typhoon-risk-lingjing`（人工 `git push`）。
2. 在仓库 Settings → **Secrets and variables → Actions** 添加 `VITE_TIANDITU_TOKEN`（见上）。
3. 在仓库 Settings → **Pages** → Build and deployment → Source 选 **GitHub Actions**。
4. push 到 `master` 或手动触发 Actions（`workflow_dispatch`）→ workflow 自动：
   `npm ci` → `npm run typecheck` → `npm run build`（注入 secret）→ 上传 `dist/` → 部署 Pages。
5. 部署完成后得到正式 URL：`https://ljc-nevergiveup.github.io/ai-typhoon-risk-lingjing/`。
6. 按 `submission/01_作品/deployment-checklist.md` 人工验收，并把 URL 回填 `website-link.txt`。

> 说明：工作流文件 `.github/workflows/deploy.yml` 已按 GitHub Pages 官方 Actions
> （checkout / setup-node / configure-pages / upload-pages-artifact / deploy-pages）编写。
> `base: './'` 经子路径模拟验证：`/ai-typhoon-risk-lingjing/` 下全部资源（JS/CSS/data/PNG）200，
> 根路径 `/data/...` 404（无绝对路径依赖）。

## 方案 B：Vercel（备选，账号验证暂不可用）

1. Vercel → New Project → Import 本仓库（或 CLI）。
2. Framework=Vite；Build=`npm run build`；Output=`dist`；Install=`npm ci`。
3. Settings → Environment Variables 添加 `VITE_TIANDITU_TOKEN`。
4. Deploy 得到 HTTPS URL，回填 `website-link.txt`。

## 部署注意事项

- 正式运行时外部依赖仅允许天地图官方底图服务（`tianditu.gov.cn`）；CARTO 已移除（0 引用），
  科学数据全部本地加载（见 `docs/competition/network-dependency-audit.md`）。
- 地图合规（国家版图最终人工检查）见 `docs/competition/map-compliance-audit.md`。
- 不要把 `public/data/raw/` 单独上传（构建已自动排除）。
