# 竞技场 · The Arena（v2）

2026 世界杯决赛（西班牙 vs 阿根廷）单场预测市场网站。

站点：https://joshzhao0218.github.io/arena-final/

## v2 新增

- 流动性池展示（`LiquidityPool`）
- 伪实时价格心跳（`MarketTicker` / `PricePulse`）
- 回声空仓提示（`userPosition`）

## 本地运行

```bash
npm install
npm run dev          # 开发 http://localhost:3000
npm run build        # 静态导出到 out/
npm run preview      # 预览 out/
npm run deploy:pages # 构建并推送到 gh-pages
```

## GitHub Pages

- 仓库：https://github.com/joshzhao0218/arena-final
- 发布：`gh-pages` 分支
- `basePath`：`/arena-final`

## 页面

| 路径 | 说明 |
|------|------|
| `/` | 决赛首页：倒计时、流动性、五市场、分析师、回声 |
| `/market/[id]/` | 交易 |
| `/portfolio/` | 持仓与赛后结算 |
