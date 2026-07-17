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
import {
  deductBalance,
  formatBalance,
  getBalance,
  addBalance,
  resetAccountBalance,
  setBalance,
} from "./account";
import {
  buyNo,
  buyRegular,
  buyYes,
  priceYes,
  regularPrices,
  tradeCost,
} from "./amm";
import { isSettlementUnlocked } from "./markets";
import { freshPools, sanitizePools, type PoolsState } from "./poolGuard";
import type {
  BinaryPool,
  BinarySide,
  MarketId,
  Position,
  RegularOutcome,
  RegularPool,
} from "./types";

const POOLS_KEY = "arena_pools_v3";
const POSITIONS_KEY = "arena_positions_v3";
const REALIZED_KEY = "arena_realized_v3";

function initialPools(): PoolsState {
  return freshPools();
}

function loadPools(): PoolsState {
  if (typeof window === "undefined") return initialPools();
  try {
    const raw = localStorage.getItem(POOLS_KEY);
    if (!raw) return initialPools();
    return sanitizePools(JSON.parse(raw));
  } catch {
    return initialPools();
  }
}

function loadPositions(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) || "[]") as Position[];
  } catch {
    return [];
  }
}

function loadRealized(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(REALIZED_KEY) || "0") || 0;
}

interface ArenaStore {
  ready: boolean;
  balance: number;
  pools: PoolsState;
  positions: Position[];
  realizedPnl: number;
  toast: string | null;
  clearToast: () => void;
  tradeBinary: (
    marketId: Exclude<MarketId, "regular_time">,
    side: BinarySide,
    qty: number,
    label: string,
  ) => boolean;
  tradeRegular: (outcome: RegularOutcome, qty: number, label: string) => boolean;
  resolveBinary: (
    marketId: Exclude<MarketId, "regular_time">,
    resolution: BinarySide,
  ) => void;
  resolveRegular: (resolution: RegularOutcome) => void;
  settlePosition: (positionId: string) => void;
  resetAccount: () => void;
}

const Ctx = createContext<ArenaStore | null>(null);

export function ArenaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [balance, setBal] = useState(10000);
  const [pools, setPools] = useState<PoolsState>(initialPools);
  const [positions, setPositions] = useState<Position[]>([]);
  const [realizedPnl, setRealized] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPools(loadPools());
    setPositions(loadPositions());
    setRealized(loadRealized());
    setBal(getBalance());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(POOLS_KEY, JSON.stringify(pools));
  }, [pools, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  }, [positions, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(REALIZED_KEY, String(realizedPnl));
  }, [realizedPnl, ready]);

  const clearToast = useCallback(() => setToast(null), []);

  const refreshBalance = useCallback(() => setBal(getBalance()), []);

  const tradeBinary = useCallback(
    (
      marketId: Exclude<MarketId, "regular_time">,
      side: BinarySide,
      qty: number,
      label: string,
    ) => {
      if (qty < 1) return false;
      const pool = pools[marketId];
      if (pool.resolved) {
        setToast("市场已结算，无法交易");
        return false;
      }
      const yes = priceYes(pool.yesShares, pool.noShares);
      const price = side === "yes" ? yes : 1 - yes;
      const cost = tradeCost(qty, price);
      if (!deductBalance(cost)) {
        setToast(`余额不足（可用：${formatBalance(getBalance())} 积分）`);
        return false;
      }
      const next = side === "yes" ? buyYes(pool, qty) : buyNo(pool, qty);
      const nextPrice = priceYes(next.yesShares, next.noShares);
      setPools((p) => ({ ...p, [marketId]: next }));
      setPositions((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          marketId,
          side,
          label,
          quantity: qty,
          entryPrice: price,
          settled: false,
        },
        ...prev,
      ]);
      refreshBalance();
      setToast(
        `交易成功！新价格：${(nextPrice * 100).toFixed(1)}¢ · 成本 ${cost.toFixed(2)}`,
      );
      return true;
    },
    [pools, refreshBalance],
  );

  const tradeRegular = useCallback(
    (outcome: RegularOutcome, qty: number, label: string) => {
      if (qty < 1) return false;
      const pool = pools.regular_time;
      if (pool.resolved) {
        setToast("市场已结算，无法交易");
        return false;
      }
      const prices = regularPrices(pool);
      const price = prices[outcome];
      const cost = tradeCost(qty, price);
      if (!deductBalance(cost)) {
        setToast(`余额不足（可用：${formatBalance(getBalance())} 积分）`);
        return false;
      }
      const next = buyRegular(pool, outcome, qty);
      const nextPrices = regularPrices(next);
      setPools((p) => ({ ...p, regular_time: next }));
      setPositions((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          marketId: "regular_time",
          side: outcome,
          label,
          quantity: qty,
          entryPrice: price,
          settled: false,
        },
        ...prev,
      ]);
      refreshBalance();
      setToast(
        `交易成功！新价格：${(nextPrices[outcome] * 100).toFixed(1)}¢ · 成本 ${cost.toFixed(2)}`,
      );
      return true;
    },
    [pools.regular_time, refreshBalance],
  );

  const resolveBinary = useCallback(
    (marketId: Exclude<MarketId, "regular_time">, resolution: BinarySide) => {
      if (!isSettlementUnlocked()) {
        setToast("结算已锁定 · 比赛结束后再开启");
        return;
      }
      setPools((prev) => ({
        ...prev,
        [marketId]: { ...prev[marketId], resolved: true, resolution },
      }));
      setToast(`已裁定：${marketId} → ${resolution.toUpperCase()}`);
    },
    [],
  );

  const resolveRegular = useCallback((resolution: RegularOutcome) => {
    if (!isSettlementUnlocked()) {
      setToast("结算已锁定 · 比赛结束后再开启");
      return;
    }
    setPools((prev) => ({
      ...prev,
      regular_time: {
        ...prev.regular_time,
        resolved: true,
        resolution,
      },
    }));
    setToast(`已裁定常规时间：${resolution}`);
  }, []);

  const settlePosition = useCallback(
    (positionId: string) => {
      if (!isSettlementUnlocked()) {
        setToast("结算已锁定 · 比赛结束后再开启");
        return;
      }
      const pos = positions.find((p) => p.id === positionId);
      if (!pos || pos.settled) return;

      let won = false;
      if (pos.marketId === "regular_time") {
        const pool = pools.regular_time;
        if (!pool.resolved || !pool.resolution) return;
        won = pos.side === pool.resolution;
      } else {
        const pool = pools[pos.marketId];
        if (!pool.resolved || !pool.resolution) return;
        won = pos.side === pool.resolution;
      }

      const payout = won ? pos.quantity * 1 : 0;
      const cost = pos.quantity * pos.entryPrice;
      const pnl = payout - cost;
      if (payout > 0) addBalance(payout);
      refreshBalance();
      setRealized((r) => r + pnl);
      setPositions((prev) =>
        prev.map((p) =>
          p.id === positionId ? { ...p, settled: true, payout } : p,
        ),
      );
      setToast(
        won
          ? `结算成功：兑付 ${payout.toFixed(2)}（盈 ${pnl.toFixed(2)}）`
          : `结算归零：亏损 ${cost.toFixed(2)}`,
      );
    },
    [pools, positions, refreshBalance],
  );

  const resetAccount = useCallback(() => {
    const next = initialPools();
    setPools(next);
    setPositions([]);
    setRealized(0);
    resetAccountBalance();
    setBalance(10000);
    setBal(10000);
    localStorage.setItem(POOLS_KEY, JSON.stringify(next));
    localStorage.setItem(POSITIONS_KEY, "[]");
    localStorage.setItem(REALIZED_KEY, "0");
    setToast("已重置本金 10,000 积分与全部市场");
  }, []);

  const value = useMemo(
    () => ({
      ready,
      balance,
      pools,
      positions,
      realizedPnl,
      toast,
      clearToast,
      tradeBinary,
      tradeRegular,
      resolveBinary,
      resolveRegular,
      settlePosition,
      resetAccount,
    }),
    [
      ready,
      balance,
      pools,
      positions,
      realizedPnl,
      toast,
      clearToast,
      tradeBinary,
      tradeRegular,
      resolveBinary,
      resolveRegular,
      settlePosition,
      resetAccount,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArena() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useArena must be used within ArenaProvider");
  return ctx;
}
