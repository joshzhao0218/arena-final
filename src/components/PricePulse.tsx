import type { Direction } from "@/lib/useMarketTicker";
import { decimalOdds, formatPct } from "@/lib/amm";

export function PricePulse({
  price,
  direction,
  delta,
  compact = false,
}: {
  price: number;
  direction: Direction;
  delta: number;
  compact?: boolean;
}) {
  const color =
    direction === "up"
      ? "text-arena-gold"
      : direction === "down"
        ? "text-text-muted"
        : "text-arena-gold";

  return (
    <p className={`score-num mt-0.5 ${compact ? "text-lg" : "text-xl"} ${color}`}>
      赔率 {decimalOdds(price).toFixed(2)}
      {direction === "up" ? (
        <span className="ml-1 text-sm text-arena-gold">▲</span>
      ) : direction === "down" ? (
        <span className="ml-1 text-sm text-text-muted">▼</span>
      ) : null}
      <span className="ml-2 text-sm font-semibold text-text-primary/80">
        ｜ 隐含概率 {formatPct(price)}
      </span>
      {Math.abs(delta) >= 0.005 ? (
        <span
          className={`ml-2 text-xs font-mono ${
            delta > 0 ? "text-arena-green/70" : "text-arena-red/70"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(2)}
        </span>
      ) : null}
    </p>
  );
}
