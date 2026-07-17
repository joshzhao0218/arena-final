# 竞技场 · The Arena

2026 世界杯决赛（西班牙 vs 阿根廷）单场预测市场网站。

**部署目标：GitHub Pages（纯静态站）**

推送到 `main` / `master` 后，GitHub Actions 自动构建并发布。

站点地址（仓库名不同请自行替换）：

`https://<你的用户名>.github.io/arena-final-20260717/`

## 架构（GitHub Pages 可用）

```
arena-final-20260717/
├── .github/workflows/deploy-pages.yml   # Pages 自动部署
├── public/                              # 静态资源（含 .nojekyll）
├── out/                                 # next build 产物（本地生成，不入库）
├── src/
│   ├── app/                             # App Router 页面（静态预渲染）
│   │   ├── page.tsx                     # /
│   │   ├── portfolio/page.tsx           # /portfolio/
│   │   └── market/[id]/                # /market/<id>/（generateStaticParams）
│   ├── components/                      # UI（交易、回声、分析师等）
│   ├── lib/                             # AMM、账户、回声状态机（全客户端）
│   └── server/api/                      # 可选：原 Anthropic API（Pages 不用）
├── next.config.ts                       # output:'export' + basePath
└── package.json
```

要点：

| 项 | 说明 |
|----|------|
| `output: 'export'` | 生成纯静态 `out/`，可直接给 Pages |
| `basePath` | 仓库页自动为 `/<repo>` |
| 动态路由 | `generateStaticParams` 预生成五个市场页 |
| 无 API | Pages 无 Node；回声/分析师走客户端降级逻辑 |
| Actions | push 即构建上传 `out/` |

## 本地运行

```bash
npm install
npm run dev          # 开发
npm run build        # 静态导出到 out/
npm run preview      # 本地预览 out/
```

本地若需模拟 GitHub Pages 的子路径：

```bash
GITHUB_PAGES=true GITHUB_REPOSITORY=你的用户名/arena-final-20260717 npm run build
```

## 启用 GitHub Pages

当前已部署：

- 仓库：https://github.com/joshzhao0218/arena-final-20260717
- 站点：https://joshzhao0218.github.io/arena-final-20260717/
- 发布方式：`gh-pages` 分支（静态 `out/`）

本地重新发布：

```bash
npm run deploy:pages
```

若要用 GitHub Actions 自动部署，需先给 token 加上 `workflow` 权限：

```bash
gh auth refresh -h github.com -s workflow,repo
git add .github/workflows/deploy-pages.yml
git commit -m "Enable Actions Pages deploy"
git push
```

然后在 **Settings → Pages → Source** 选 **GitHub Actions**。

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 决赛首页：倒计时、五市场、分析师、回声 |
| `/market/[id]/` | 交易 |
| `/portfolio/` | 持仓与赛后结算 |

交易与余额均在浏览器本地（localStorage），无需后端。

## 可选：恢复服务端 AI（非 Pages）

见 `src/server/api/README.md`。需去掉静态导出并部署到 Vercel 等 Node 环境。
