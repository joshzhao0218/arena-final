"use client";

import { MatchBanner } from "@/components/MatchBanner";
import { PortfolioList } from "@/components/PortfolioList";

export default function PortfolioPage() {
  return (
    <div className="space-y-8">
      <MatchBanner compact />
      <div>
        <p className="text-xs uppercase tracking-wider text-arena-gold">
          Portfolio
        </p>
        <h2 className="font-serif text-3xl italic text-text-primary">我的持仓</h2>
        <p className="mt-1 text-sm text-text-muted">
          余额 · 持仓 · 盈亏 · 赛后结算
        </p>
      </div>
      <PortfolioList />
    </div>
  );
}
