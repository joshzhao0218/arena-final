import { createBinaryPool, createRegularPool } from "./amm";
import { MARKETS } from "./markets";
import type { BinaryPool, RegularPool } from "./types";

export type PoolsState = {
  champion: BinaryPool;
  regular_time: RegularPool;
  goals: BinaryPool;
  penalty: BinaryPool;
  duo: BinaryPool;
};

export function isRegularPool(p: unknown): p is RegularPool {
  if (!p || typeof p !== "object") return false;
  const o = p as RegularPool;
  return (
    !!o.spainPool &&
    !!o.argentinaPool &&
    typeof o.spainPool.yesShares === "number" &&
    typeof o.argentinaPool.yesShares === "number" &&
    Array.isArray(o.history)
  );
}

export function isBinaryPool(p: unknown): p is BinaryPool {
  if (!p || typeof p !== "object") return false;
  const o = p as BinaryPool;
  return (
    typeof o.yesShares === "number" &&
    typeof o.noShares === "number" &&
    Array.isArray(o.history)
  );
}

export function freshPools(): PoolsState {
  const champ = MARKETS.find((m) => m.id === "champion")!;
  const goals = MARKETS.find((m) => m.id === "goals")!;
  const penalty = MARKETS.find((m) => m.id === "penalty")!;
  const duo = MARKETS.find((m) => m.id === "duo")!;
  const regular = MARKETS.find((m) => m.id === "regular_time")!;

  return {
    champion: createBinaryPool(
      champ.initialYes,
      champ.initialNo,
      champ.initialYesBias,
    ),
    regular_time: createRegularPool(regular.initialYes, regular.initialNo),
    goals: createBinaryPool(
      goals.initialYes,
      goals.initialNo,
      goals.initialYesBias,
    ),
    penalty: createBinaryPool(
      penalty.initialYes,
      penalty.initialNo,
      penalty.initialYesBias,
    ),
    duo: createBinaryPool(duo.initialYes, duo.initialNo, duo.initialYesBias),
  };
}

/** 合并本地缓存时校验结构，损坏则回退初始池 */
export function sanitizePools(raw: unknown): PoolsState {
  const base = freshPools();
  if (!raw || typeof raw !== "object") return base;
  const saved = raw as Record<string, unknown>;

  const binaryIds = ["champion", "goals", "penalty", "duo"] as const;
  for (const id of binaryIds) {
    const candidate = saved[id];
    if (isBinaryPool(candidate)) {
      base[id] = {
        ...candidate,
        history:
          candidate.history.length >= 2
            ? candidate.history
            : base[id].history,
      };
    }
  }

  if (isRegularPool(saved.regular_time)) {
    base.regular_time = {
      ...saved.regular_time,
      history:
        saved.regular_time.history.length >= 2
          ? saved.regular_time.history
          : base.regular_time.history,
    };
  }

  return base;
}
