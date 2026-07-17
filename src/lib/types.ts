export type MarketId =
  | "champion"
  | "regular_time"
  | "goals"
  | "penalty"
  | "duo";

export type BinarySide = "yes" | "no";

export type RegularOutcome = "spain" | "draw" | "argentina";

export interface BinaryPool {
  yesShares: number;
  noShares: number;
  history: number[];
  volume: number;
  resolved: boolean;
  resolution: BinarySide | null;
}

/** 常规时间：双池模拟三态 */
export interface RegularPool {
  spainPool: { yesShares: number; noShares: number }; // 西班牙胜 vs 非西班牙胜
  argentinaPool: { yesShares: number; noShares: number }; // 阿根廷胜 vs 非阿根廷胜
  history: number[]; // 西班牙胜价格走势
  volume: number;
  resolved: boolean;
  resolution: RegularOutcome | null;
}

export type MarketPool = BinaryPool | RegularPool;

export interface Position {
  id: string;
  marketId: MarketId;
  side: BinarySide | RegularOutcome;
  label: string;
  quantity: number;
  entryPrice: number;
  settled: boolean;
  payout?: number;
}

export interface AnalystResponse {
  verdict: string;
  tacticalRead: string;
  sharpMove: string;
  edge: string;
}

export interface EchoMessage {
  role: "user" | "assistant";
  content: string;
}
