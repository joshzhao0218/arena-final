import type { Position } from "./types";

export type UserPositionPayload = {
  hasPosition: boolean;
  summary: string;
  items: Array<{
    marketId: string;
    option: string;
    quantity: number;
    avgPrice: number;
  }>;
};

export function buildUserPosition(
  positions: Position[],
  balance: number,
): UserPositionPayload {
  const open = positions.filter((p) => !p.settled);
  if (!open.length) {
    return {
      hasPosition: false,
      summary: `空仓，拥有 ${Math.round(balance).toLocaleString("en-US")} 积分待部署。`,
      items: [],
    };
  }

  const items = open.map((p) => ({
    marketId: p.marketId,
    option: p.label,
    quantity: p.quantity,
    avgPrice: p.entryPrice,
  }));

  const summary = open
    .slice(0, 3)
    .map(
      (p) =>
        `持有${p.label} ${p.quantity}股，成本价 ${p.entryPrice.toFixed(2)}`,
    )
    .join("；");

  return { hasPosition: true, summary, items };
}
