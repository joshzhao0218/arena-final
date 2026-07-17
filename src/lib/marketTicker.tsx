"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { priceYes, regularPrices } from "./amm";
import { MARKETS } from "./markets";
import { useArena } from "./store";
import type { BinaryPool, MarketId } from "./types";

export type Direction = "up" | "down" | "flat";

export type TickerRow = {
  key: string; // marketId:optionIndex
  marketId: MarketId;
  label: string;
  price: number;
  basePrice: number;
  delta: number;
  direction: Direction;
};

type TickerMap = Record<string, TickerRow>;

function clamp(p: number) {
  return Math.min(0.95, Math.max(0.05, p));
}

function baseRows(
  pools: ReturnType<typeof useArena>["pools"],
): TickerMap {
  const out: TickerMap = {};
  for (const m of MARKETS) {
    if (m.kind === "regular") {
      const p = regularPrices(pools.regular_time);
      const vals = [p.spain, p.draw, p.argentina];
      m.options.forEach((label, i) => {
        const key = `${m.id}:${i}`;
        const price = vals[i] ?? 0.33;
        out[key] = {
          key,
          marketId: m.id,
          label,
          price,
          basePrice: price,
          delta: 0,
          direction: "flat",
        };
      });
    } else {
      const pool = pools[m.id] as BinaryPool;
      const yes = priceYes(pool.yesShares, pool.noShares);
      const vals = [yes, 1 - yes];
      m.options.forEach((label, i) => {
        const key = `${m.id}:${i}`;
        const price = vals[i] ?? 0.5;
        out[key] = {
          key,
          marketId: m.id,
          label,
          price,
          basePrice: price,
          delta: 0,
          direction: "flat",
        };
      });
    }
  }
  return out;
}

interface TickerCtx {
  rows: TickerMap;
  getPrice: (marketId: MarketId, optionIndex: number) => number;
  getRow: (marketId: MarketId, optionIndex: number) => TickerRow | undefined;
  /** 下单后：用最新 AMM 覆盖展示价 */
  syncFromPools: () => void;
}

const Ctx = createContext<TickerCtx | null>(null);

export function MarketTickerProvider({ children }: { children: ReactNode }) {
  const { pools, ready } = useArena();
  const [rows, setRows] = useState<TickerMap>({});
  const poolsKey = useMemo(() => JSON.stringify(pools), [pools]);

  const syncFromPools = useCallback(() => {
    setRows(baseRows(pools));
  }, [pools]);

  // AMM 变化（含下单）时固化为新基准
  useEffect(() => {
    if (!ready) return;
    setRows(baseRows(pools));
  }, [poolsKey, ready, pools]);

  // 伪实时呼吸：仅改展示层
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setRows((prev) => {
        if (!Object.keys(prev).length) return prev;
        const next: TickerMap = { ...prev };
        for (const key of Object.keys(next)) {
          const row = next[key];
          const change = (Math.random() - 0.5) * 0.06;
          const price = clamp(row.price + change);
          const delta = price - row.basePrice;
          const direction: Direction =
            Math.abs(delta) < 0.002 ? "flat" : delta > 0 ? "up" : "down";
          next[key] = { ...row, price, delta, direction };
        }
        return next;
      });
      const delay = 8000 + Math.floor(Math.random() * 4000);
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 8000 + Math.floor(Math.random() * 4000));
    return () => clearTimeout(timer);
  }, [ready]);

  const value = useMemo<TickerCtx>(
    () => ({
      rows,
      getPrice: (marketId, optionIndex) => {
        const key = `${marketId}:${optionIndex}`;
        return rows[key]?.price ?? 0.5;
      },
      getRow: (marketId, optionIndex) => rows[`${marketId}:${optionIndex}`],
      syncFromPools,
    }),
    [rows, syncFromPools],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarketTicker() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useMarketTicker must be used within MarketTickerProvider");
  }
  return ctx;
}

/** 兼容 Prompt 文件名：再导出 Hook 别名 */
export { useMarketTicker as useMarketTickerHook };
