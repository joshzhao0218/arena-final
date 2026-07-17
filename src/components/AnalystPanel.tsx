"use client";

import { useState } from "react";
import { formatPct, priceYes } from "@/lib/amm";
import { useArena } from "@/lib/store";
import type { AnalystResponse } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function localFallback(pools: ReturnType<typeof useArena>["pools"]): AnalystResponse {
  const champ = pools.champion;
  const yes = priceYes(champ.yesShares, champ.noShares);
  return {
    verdict: `市场当前定价为 ${formatPct(yes)}（阿根廷夺冠侧），资金平稳。`,
    tacticalRead: `大于 2.5 球隐含概率 ${formatPct(priceYes(pools.goals.yesShares, pools.goals.noShares))}，盘口倾向开放对攻而非死守。`,
    sharpMove: "未见异常大单扰动五道命题。",
    edge:
      "关注罗德里中场控制与梅西最后三十米决策之间的定价差——情绪溢价往往落在传奇叙事，而非控球骨架。",
  };
}

export function AnalystPanel() {
  const { pools, ready } = useArena();
  const [data, setData] = useState<AnalystResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!ready) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 220));
    setData(localFallback(pools));
    setLoading(false);
  };

  const view = data ?? localFallback(pools);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
        <div>
          <p className="text-xs uppercase tracking-wider text-arena-gold">
            AI Match Analyst
          </p>
          <CardTitle className="text-xl">决赛分析师</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={() => void run()} disabled={loading}>
          {loading ? "研判中…" : "刷新研判"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p className="text-xs text-text-muted">
          静态站模式：根据当前盘口生成研判（无服务端 API）。
        </p>
        <Block label="Verdict" text={view.verdict} />
        <Block label="Tactical" text={view.tacticalRead} />
        <Block label="Sharp Move" text={view.sharpMove} />
        <Block label="Edge" text={view.edge} />
      </CardContent>
    </Card>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 text-text-primary/90">{text}</p>
    </div>
  );
}
