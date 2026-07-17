"use client";

import Link from "next/link";
import { priceYes, regularPrices } from "@/lib/amm";
import { ruleTag, type MarketDef } from "@/lib/markets";
import { useArena } from "@/lib/store";
import { useMarketTicker } from "@/lib/useMarketTicker";
import type { BinaryPool, RegularPool } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PricePulse } from "./PricePulse";
import { Sparkline } from "./Sparkline";

function fallbackHistory(center: number): number[] {
  return Array.from({ length: 20 }, (_, i) =>
    Math.min(0.8, Math.max(0.2, center + Math.sin(i * 0.7) * 0.03)),
  );
}

export function MarketCard({
  market,
  featured = false,
}: {
  market: MarketDef;
  featured?: boolean;
}) {
  const { pools, ready } = useArena();
  const { getRow } = useMarketTicker();

  let history: number[] = [];

  if (ready) {
    if (market.kind === "regular") {
      const pool = pools.regular_time as RegularPool;
      const p = regularPrices(pool);
      history =
        pool.history?.length >= 2 ? pool.history : fallbackHistory(p.spain);
    } else {
      const pool = pools[market.id] as BinaryPool;
      const yes = priceYes(pool.yesShares, pool.noShares);
      history =
        pool.history?.length >= 2 ? pool.history : fallbackHistory(yes);
    }
  } else {
    history = fallbackHistory(0.5);
  }

  const tag = ruleTag(market);
  const optionIndexes = market.options.map((_, i) => i);

  return (
    <Card
      className={`card-lift ${featured ? "border-arena-gold/35 lg:col-span-2" : ""}`}
      id={`market-card-${market.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>
              {market.question}
              {tag ? (
                <span className="ml-2 font-sans text-sm not-italic text-text-muted">
                  {tag}
                </span>
              ) : null}
            </CardTitle>
            {featured ? (
              <p className="mt-1 text-xs text-arena-gold/80">
                三选项核心命题 · 西班牙胜 / 平局 / 阿根廷胜
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
              24h
            </p>
            <Sparkline data={history} width={featured ? 120 : 96} />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={
          featured && optionIndexes.length === 3
            ? "grid gap-3 sm:grid-cols-3"
            : "space-y-3"
        }
      >
        {optionIndexes.map((i) => {
          const row = getRow(market.id, i);
          const label = market.options[i];
          const price = row?.price ?? 0.5;
          const direction = row?.direction ?? "flat";
          const delta = row?.delta ?? 0;
          return (
            <div
              key={`${market.id}-${label}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border-subtle/80 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{label}</p>
                <PricePulse
                  price={price}
                  direction={direction}
                  delta={delta}
                />
              </div>
              <Link href={`/market/${market.id}`}>
                <Button variant="outline" size="sm" type="button">
                  交易
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
