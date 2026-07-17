"use client";

import { useEffect, useMemo, useState } from "react";
import { priceYes, regularPrices } from "@/lib/amm";
import { useArena } from "@/lib/store";
import type { BinaryPool } from "@/lib/types";

const ENTRANTS_KEY = "arena_ghost_entrants";
const POOL_SEED_KEY = "arena_ghost_pool_seed";

function seededPoolBase(): number {
  if (typeof window === "undefined") return 12847;
  let seed = localStorage.getItem(POOL_SEED_KEY);
  if (!seed) {
    seed = String(12000 + Math.floor(Math.random() * 2000));
    localStorage.setItem(POOL_SEED_KEY, seed);
  }
  return Number(seed) || 12847;
}

export function LiquidityPool() {
  const { pools, positions, ready } = useArena();
  const [entrants, setEntrants] = useState(12);
  const [seed, setSeed] = useState(12847);

  useEffect(() => {
    setSeed(seededPoolBase());
    try {
      const n = Number(localStorage.getItem(ENTRANTS_KEY) || "12");
      setEntrants(Number.isFinite(n) && n >= 12 ? n : 12);
    } catch {
      setEntrants(12);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => {
        setEntrants((n) => {
          const next = n + (1 + Math.floor(Math.random() * 3));
          localStorage.setItem(ENTRANTS_KEY, String(next));
          return next;
        });
      },
      180000 + Math.floor(Math.random() * 120000),
    );
    return () => clearInterval(id);
  }, []);

  const poolValue = useMemo(() => {
    if (!ready) return seed;
    let mtm = 0;
    const champ = priceYes(pools.champion.yesShares, pools.champion.noShares);
    mtm += pools.champion.yesShares * champ;
    const goals = pools.goals as BinaryPool;
    mtm += goals.yesShares * priceYes(goals.yesShares, goals.noShares);
    const pen = pools.penalty as BinaryPool;
    mtm += pen.yesShares * priceYes(pen.yesShares, pen.noShares);
    const duo = pools.duo as BinaryPool;
    mtm += duo.yesShares * priceYes(duo.yesShares, duo.noShares);
    const rt = regularPrices(pools.regular_time);
    mtm +=
      pools.regular_time.spainPool.yesShares * rt.spain +
      pools.regular_time.argentinaPool.yesShares * rt.argentina;

    const openCost = positions
      .filter((p) => !p.settled)
      .reduce((s, p) => s + p.quantity * p.entryPrice, 0);

    // 初始池 + YES 市值×2 的幽灵放大；无仓时用固定种子
    if (openCost <= 0 && mtm < 50) return seed;
    return Math.round(10000 + mtm * 2 + openCost);
  }, [pools, positions, ready, seed]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="animate-pulse-gold h-1.5 w-1.5 rounded-full bg-arena-gold" />
        当前奖池累积：
        <span className="score-num text-arena-gold">
          {poolValue.toLocaleString("en-US")}
        </span>{" "}
        积分
      </span>
      <span className="text-border-subtle">|</span>
      <span>
        过去 1 小时{" "}
        <span className="score-num text-arena-gold">{entrants}</span> 人入场
      </span>
    </div>
  );
}
