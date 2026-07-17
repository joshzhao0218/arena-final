# 可选：服务端 AI Route（非 GitHub Pages）

GitHub Pages 只托管静态文件，不能运行 Next.js Route Handlers。

本目录保留 v2 的 `/api/echo`、`/api/analyze` 实现，便于以后迁回：

1. 将 `echo/`、`analyze/` 移回 `src/app/api/`
2. 去掉 `next.config.ts` 里的 `output: "export"`
3. 部署到 Vercel / Node 主机，并配置 `ANTHROPIC_API_KEY`

当前线上 GitHub Pages 使用客户端降级逻辑：

- 回声：`src/lib/echoLogic.ts` + `userPosition`
- 分析师：`src/components/AnalystPanel.tsx` 内 `localFallback`
