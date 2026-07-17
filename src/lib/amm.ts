import type { BinaryPool, RegularOutcome, RegularPool } from "./types";

const HISTORY_LEN = 20;

export function priceYes(yesShares: number, noShares: number): number {
  const total = yesShares + noShares;
  if (total <= 0) return 0.5;
  return yesShares / total;
}

export function decimalOdds(probability: number): number {
  const p = Math.min(0.99, Math.max(0.01, probability));
  return Math.round((1 / p) * 100) / 100;
}

export function formatPct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

export function tradeCost(shares: number, price: number): number {
  return shares * price;
}

function seededHistory(seed: number, center: number): number[] {
  const out: number[] = [];
  let x = seed;
  let v = center;
  for (let i = 0; i < HISTORY_LEN; i++) {
    x = (x * 1664525 + 1013904223) % 4294967296;
    const noise = ((x / 4294967296) - 0.5) * 0.04;
    v = Math.min(0.85, Math.max(0.15, v + noise));
    out.push(v);
  }
  out[out.length - 1] = center;
  return out;
}

export function createBinaryPool(
  initialYes: number,
  initialNo: number,
  yesBias?: number,
): BinaryPool {
  let yesShares = initialYes;
  let noShares = initialNo;
  if (yesBias != null) {
    const total = initialYes + initialNo;
    yesShares = Math.round(total * yesBias);
    noShares = total - yesShares;
  }
  const price = priceYes(yesShares, noShares);
  return {
    yesShares,
    noShares,
    history: seededHistory(yesShares * 17 + noShares, price),
    volume: 0,
    resolved: false,
    resolution: null,
  };
}

export function createRegularPool(initialYes: number, initialNo: number): RegularPool {
  // 西班牙胜 ~36%，阿根廷胜 ~36% → 平局近似 28%
  const spainYes = Math.round((initialYes + initialNo) * 0.36);
  const spainNo = initialYes + initialNo - spainYes;
  const argYes = Math.round((initialYes + initialNo) * 0.36);
  const argNo = initialYes + initialNo - argYes;
  const spainPrice = priceYes(spainYes, spainNo);
  return {
    spainPool: { yesShares: spainYes, noShares: spainNo },
    argentinaPool: { yesShares: argYes, noShares: argNo },
    history: seededHistory(91, spainPrice),
    volume: 0,
    resolved: false,
    resolution: null,
  };
}

export function regularPrices(pool: RegularPool) {
  const spain = priceYes(pool.spainPool.yesShares, pool.spainPool.noShares);
  const argentina = priceYes(
    pool.argentinaPool.yesShares,
    pool.argentinaPool.noShares,
  );
  // 平局价格 ≈ (1 - 西班牙胜) + (1 - 阿根廷胜) - 1
  let draw = 1 - spain + (1 - argentina) - 1;
  draw = Math.max(0.05, Math.min(0.9, draw));
  // 归一化使三者之和约为 1
  const rawSum = spain + argentina + draw;
  return {
    spain: spain / rawSum,
    draw: draw / rawSum,
    argentina: argentina / rawSum,
  };
}

export function buyYes(pool: BinaryPool, qty: number): BinaryPool {
  const nextYes = pool.yesShares + qty;
  const nextPrice = priceYes(nextYes, pool.noShares);
  return {
    ...pool,
    yesShares: nextYes,
    volume: pool.volume + qty,
    history: [...pool.history.slice(-(HISTORY_LEN - 1)), nextPrice],
  };
}

export function buyNo(pool: BinaryPool, qty: number): BinaryPool {
  const nextNo = pool.noShares + qty;
  const nextPrice = priceYes(pool.yesShares, nextNo);
  return {
    ...pool,
    noShares: nextNo,
    volume: pool.volume + qty,
    history: [...pool.history.slice(-(HISTORY_LEN - 1)), nextPrice],
  };
}

/** 买入某常规时间结果：更新对应池 */
export function buyRegular(
  pool: RegularPool,
  outcome: RegularOutcome,
  qty: number,
): RegularPool {
  const next: RegularPool = {
    ...pool,
    spainPool: { ...pool.spainPool },
    argentinaPool: { ...pool.argentinaPool },
  };

  if (outcome === "spain") {
    next.spainPool.yesShares += qty;
    next.argentinaPool.noShares += qty; // 非阿根廷胜
  } else if (outcome === "argentina") {
    next.argentinaPool.yesShares += qty;
    next.spainPool.noShares += qty; // 非西班牙胜
  } else {
    // 平局：两边「非胜」都增加
    next.spainPool.noShares += qty;
    next.argentinaPool.noShares += qty;
  }

  next.volume += qty;
  const prices = regularPrices(next);
  next.history = [...pool.history.slice(-(HISTORY_LEN - 1)), prices.spain];
  return next;
}
