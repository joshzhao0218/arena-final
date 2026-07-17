"use client";

import Link from "next/link";
import { MatchBanner } from "@/components/MatchBanner";
import { Sparkline } from "@/components/Sparkline";
import { TradePanel } from "@/components/TradePanel";
import { Card, CardContent } from "@/components/ui/card";
import { getMarket, isMarketId, ruleTag } from "@/lib/markets";
import { useArena } from "@/lib/store";

export function MarketPageClient({ id }: { id: string }) {
  const { pools, ready } = useArena();

  if (!isMarketId(id)) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-muted">未知市场</p>
        <Link href="/" className="mt-4 inline-block text-arena-gold">
          ← 返回角斗场
        </Link>
      </div>
    );
  }

  const market = getMarket(id)!;
  const tag = ruleTag(market);
  const history = ready
    ? id === "regular_time"
      ? pools.regular_time.history
      : pools[id].history
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <MatchBanner compact />

      <div className="animate-fade-up">
        <Link href="/" className="text-xs text-text-muted hover:text-arena-gold">
          ← 全部市场
        </Link>
        <h2 className="mt-3 font-serif text-3xl italic leading-snug text-text-primary sm:text-4xl">
          {market.question}
          {tag ? (
            <span className="ml-2 font-sans text-lg not-italic text-text-muted">
              {tag}
            </span>
          ) : null}
        </h2>
        {market.id === "regular_time" ? (
          <p className="mt-2 text-sm text-text-muted">
            仅常规时间（90 分钟 + 伤停），不含加时与点球大战
          </p>
        ) : market.includesExtraTime ? (
          <p className="mt-2 text-sm text-text-muted">
            统计范围含加时赛，不含点球大战进球
          </p>
        ) : null}
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <span className="text-xs uppercase tracking-wider text-text-muted">
            24h 走势
          </span>
          <Sparkline
            data={
              history.length >= 2
                ? history
                : Array.from({ length: 20 }, (_, i) => 0.5 + Math.sin(i) * 0.02)
            }
            width={240}
            height={40}
          />
        </CardContent>
      </Card>

      <TradePanel market={market} />

      <aside className="rounded-lg border border-arena-gold/20 bg-bg-card/60 px-5 py-4">
        <p className="text-[10px] uppercase tracking-wider text-arena-gold">
          市场叙事
        </p>
        <p className="mt-1 font-serif text-base italic text-text-primary/90">
          「{market.narrative}」
        </p>
      </aside>
    </div>
  );
}
