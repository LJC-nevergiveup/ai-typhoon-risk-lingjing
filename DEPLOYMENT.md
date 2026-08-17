# 部署说明（DEPLOYMENT）

本作品为**纯静态站点**，无后端、无数据库。`vite.config.ts` 已设 `base: './'`（相对路径），
可直接部署到任意静态托管（含子路径）。

## 构建

```bash
npm install
npm run build     # 类型检查 + 构建，产物在 dist/
```

- 产物目录：`dist/`（约 16.6 MB；`public/data/raw/` 原始大文件已在构建时剔除，不随作品部署）。
- 本地预览构建产物：`npm run preview`；开发：`npm run dev`（http://localhost:5173）。

## 方案 A：Vercel（推荐，最简单）

1. 在 vercel.com 用 GitHub/GitLab 账号导入本仓库（或拖拽本目录）。
2. 框架选 **Vite**；构建命令 `npm run build`；输出目录 `dist`。
3. 点击 Deploy，得到正式 URL；将 URL 回填到 `submission/01_作品/website-link.txt`。

> 说明：不自动创建公开远程仓库、不上传未经批准的数据；上述“导入仓库/授权 Vercel”为人工步骤。

## 方案 B：GitHub Pages

1. 在 GitHub 创建仓库并推送本目录（`git push`，需人工执行）。
2. 用 `gh-pages` 分支或 GitHub Actions（Vite 构建 → `dist` 发布）部署。
3. `base: './'` 已保证子路径（如 `https://user.github.io/repo/`）下资源路径正确，刷新页面不会 404。
4. 将正式 URL 回填到 `submission/01_作品/website-link.txt`。

## 部署注意事项

- 底图为 CARTO（境外服务），个别网络环境可能加载慢或失败；失败时作品会自动回退到本地纯色
  底图并提示，核心科普数据不受影响（见 `docs/competition/network-dependency-audit.md`）。
- 地图合规（国家版图）需人工核查，见 `docs/competition/map-compliance-audit.md`。
- 不要把 `public/data/raw/` 单独上传（构建已自动排除）。
