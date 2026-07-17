"use client";

import { AnalystPanel } from "@/components/AnalystPanel";
import { Countdown } from "@/components/Countdown";
import { EchoChat } from "@/components/EchoChat";
import { LiquidityPool } from "@/components/LiquidityPool";
import { MarketCard } from "@/components/MarketCard";
import { MatchBanner } from "@/components/MatchBanner";
import { MARKETS } from "@/lib/markets";

export default function HomePage() {
  const regular = MARKETS.find((m) => m.id === "regular_time")!;
  const others = MARKETS.filter((m) => m.id !== "regular_time");

  return (
    <div className="space-y-10">
      <section className="animate-fade-up">
        <MatchBanner />
        <p className="mt-2 text-center text-sm text-text-muted">
          开球 2026-07-19 · 五道题 · 一座角斗场
        </p>
        <Countdown />
        <div className="mt-4">
          <LiquidityPool />
        </div>
      </section>

      <section className="animate-fade-up grid gap-4 lg:grid-cols-2">
        <MarketCard market={regular} featured />
        {others.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </section>

      <div className="animate-fade-up space-y-4">
        <AnalystPanel />
        <EchoChat />
      </div>
    </div>
  );
}
