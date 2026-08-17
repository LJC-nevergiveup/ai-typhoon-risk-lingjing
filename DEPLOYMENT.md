# 部署说明（DEPLOYMENT）

本作品为**纯静态站点**，无后端、无数据库。`vite.config.ts` 已设 `base: './'`（相对路径），
可直接部署到任意静态托管（含子路径）。

## 当前部署状态（2026-08-17）

- **实际部署平台**：未部署（**deployment-ready**，等待作者执行部署）
- Build Command：`npm run build`（内部含 `tsc --noEmit`）
- Install Command：`npm ci`
- Output Directory：`dist`
- 环境变量：`VITE_TIANDITU_TOKEN`（必需，正式底图显示）
- Production URL：待部署后回填 `submission/01_作品/website-link.txt`
- 部署日期：—
- 待部署版本：本地 commit `90d7629`（master，工作区干净）
- 重新部署：见下方方案 A / B

> 在真正部署并验证前，本文件**不写 deployed**；部署完成、公网验收通过后，
> 由作者更新本节的 URL / 日期 / commit 字段。

## 构建

```bash
npm install
npm run build     # 类型检查 + 构建，产物在 dist/
```

- 产物目录：`dist/`（约 16.6 MB；`public/data/raw/` 原始大文件已在构建时剔除，不随作品部署）。
- 本地预览构建产物：`npm run preview`；开发：`npm run dev`（http://localhost:5173）。

## 天地图 token（正式底图必需）

正式底图使用国家地理信息公共服务平台“天地图”（官方服务）：

1. 注册并登录天地图开发者：https://console.tianditu.gov.cn/ （免费）。
2. 创建“浏览器端”应用，获取密钥（tk）。
3. 部署时把该密钥配置为环境变量 `VITE_TIANDITU_TOKEN`（示例见 `.env.example`；本地开发可复制 `.env.example` 为 `.env` 填入）。
4. 未配置 token 时页面自动使用纯色回退底图并提示“正式底图服务尚未配置，核心科普数据仍可浏览。”，**不会白屏**。
5. 注意：天地图密钥是浏览器端可见的公开密钥（官方按域名/IP 白名单限制），请勿混用需保密的服务器密钥。

## 方案 A：Vercel（推荐，最简单）

1. 将项目推送到你自己的 GitHub 仓库（人工 `git push`），或使用 Vercel CLI / 网页文件导入方式上传本目录。
2. Vercel → New Project → **Import Project**（选择该仓库/目录）。
3. Framework Preset 选 **Vite**。
4. Build Command：`npm run build`。
5. Output Directory：`dist`。
6. 在项目 Settings → Environment Variables 添加：`VITE_TIANDITU_TOKEN = <你的天地图 tk>`。
7. **Deploy**。
8. 部署完成后得到正式 **HTTPS URL**（如 `https://xxx.vercel.app`）。
9. 将正式 URL 回填到 `submission/01_作品/website-link.txt`（仅一行真实可访问链接，勿填虚假 URL）。

> 说明：本流程中的“推送仓库 / 授权 Vercel / 设置环境变量”均为人工步骤；项目代码不会自动 push、
> 不会自动创建公开远程仓库、不会上传未经批准的数据。

## 方案 B：GitHub Pages

1. 在 GitHub 创建仓库并推送本目录（人工 `git push`）。
2. 用 `gh-pages` 分支或 GitHub Actions（Vite 构建 → `dist` 发布）部署。
3. `base: './'` 已保证子路径（如 `https://user.github.io/repo/`）下资源路径正确。
4. 在仓库 Settings → Secrets / Actions 变量中设置 `VITE_TIANDITU_TOKEN`（若用 Actions 构建）。
5. 将正式 URL 回填到 `submission/01_作品/website-link.txt`。

## 部署注意事项

- 底图 = 天地图官方服务（`tianditu.gov.cn`）；未配置 token 或加载失败时自动降级，核心科普数据不受影响
  （见 `docs/competition/network-dependency-audit.md`）。
- 地图合规（国家版图最终人工检查）见 `docs/competition/map-compliance-audit.md`。
- 不要把 `public/data/raw/` 单独上传（构建已自动排除）。
