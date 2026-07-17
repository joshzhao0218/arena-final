import type { MarketId } from "./types";

export const MATCH = {
  titleEn: "Spain vs Argentina",
  titleZh: "西班牙 vs 阿根廷",
  kickoff: "2026-07-19T20:00:00+03:00",
  settlementOpensAt: "2026-07-19T23:00:00+03:00",
  venue: "多哈 · 中立场地",
  brand: "⚽ 竞技场 · 2026 决赛",
} as const;

export function isSettlementUnlocked(now = Date.now()): boolean {
  return now >= new Date(MATCH.settlementOpensAt).getTime();
}

export interface MarketDef {
  id: MarketId;
  kind: "binary" | "regular";
  question: string;
  options: string[];
  initialYes: number;
  initialNo: number;
  resolveKey: string;
  narrative: string;
  includesExtraTime: boolean;
  /** binary YES 初始偏向 */
  initialYesBias?: number;
}

export const MARKETS: MarketDef[] = [
  {
    id: "champion",
    kind: "binary",
    question: "冠军归属：阿根廷还是西班牙",
    options: ["阿根廷夺冠", "西班牙夺冠"],
    initialYes: 100,
    initialNo: 100,
    resolveKey: "champion_result",
    narrative:
      "阿根廷的夺冠概率被情绪推高，但西班牙的控球稳定性在盘口中被低估。",
    includesExtraTime: false,
    initialYesBias: 0.54,
  },
  {
    id: "regular_time",
    kind: "regular",
    question: "常规时间胜负",
    options: ["西班牙胜", "平局", "阿根廷胜"],
    initialYes: 100,
    initialNo: 100,
    resolveKey: "regular_result",
    narrative:
      "平局概率隐含在价格中，市场认为常规时间分不出胜负的概率约28%。",
    includesExtraTime: false,
  },
  {
    id: "goals",
    kind: "binary",
    question: "总进球数是否大于 2.5",
    options: ["大于 2.5 球", "小于 2.5 球"],
    initialYes: 100,
    initialNo: 100,
    resolveKey: "goals_result",
    narrative:
      "2.5球的线反映了对两队攻击线的尊重，但决赛通常收敛——市场是否太乐观？",
    includesExtraTime: true,
    initialYesBias: 0.58,
  },
  {
    id: "penalty",
    kind: "binary",
    question: "本场是否进入点球大战？",
    options: ["是，进入点球", "否，不进点球"],
    initialYes: 100,
    initialNo: 100,
    resolveKey: "penalty_result",
    narrative:
      "世界杯决赛点球的历史概率约30%，当前市场定价接近35%，略有溢价。",
    includesExtraTime: false,
    initialYesBias: 0.35,
  },
  {
    id: "duo",
    kind: "binary",
    question: "梅西或亚马尔，本场是否至少一人进球",
    options: ["是，双骄进球", "否，双骄哑火"],
    initialYes: 100,
    initialNo: 100,
    resolveKey: "duo_result",
    narrative:
      "梅西 vs 亚马尔，市场为传奇的最后一舞定价，而非基于数据的概率。",
    includesExtraTime: true,
    initialYesBias: 0.61,
  },
];

export function getMarket(id: string): MarketDef | undefined {
  return MARKETS.find((m) => m.id === id);
}

export function isMarketId(id: string): id is MarketId {
  return MARKETS.some((m) => m.id === id);
}

/** 统一规则标签：(含加时) / (不含加时) */
export function ruleTag(market: MarketDef): string {
  if (market.id === "regular_time") return "(不含加时)";
  if (market.includesExtraTime) return "(含加时)";
  return "";
}
