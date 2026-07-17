"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatBalance } from "@/lib/account";
import { priceYes, regularPrices } from "@/lib/amm";
import { getMarket, isSettlementUnlocked, MARKETS } from "@/lib/markets";
import { useArena } from "@/lib/store";
import type { BinaryPool, BinarySide, RegularOutcome } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog } from "./ui/dialog";

function markPrice(
  marketId: string,
  side: string,
  pools: ReturnType<typeof useArena>["pools"],
): number {
  if (marketId === "regular_time") {
    return regularPrices(pools.regular_time)[side as RegularOutcome];
  }
  const pool = pools[marketId as keyof typeof pools] as BinaryPool;
  const yes = priceYes(pool.yesShares, pool.noShares);
  return side === "yes" ? yes : 1 - yes;
}

export function PortfolioList() {
  const {
    ready,
    balance,
    pools,
    positions,
    realizedPnl,
    settlePosition,
    resolveBinary,
    resolveRegular,
    resetAccount,
  } = useArena();
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    const tick = () => setSettlementOpen(isSettlementUnlocked());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const openPositions = positions.filter((p) => !p.settled);
  const settledPositions = positions.filter((p) => p.settled);

  const hotMarket = useMemo(() => {
    const ranked = MARKETS.map((m) => {
      const vol =
        m.id === "regular_time"
          ? pools.regular_time.volume
          : pools[m.id].volume;
      return { m, vol };
    }).sort((a, b) => b.vol - a.vol);
    return ranked[0]?.m.id ?? "champion";
  }, [pools]);

  const stats = useMemo(() => {
    let invested = 0;
    let mtm = 0;
    for (const pos of openPositions) {
      const cost = pos.quantity * pos.entryPrice;
      const value =
        pos.quantity * markPrice(pos.marketId, String(pos.side), pools);
      invested += cost;
      mtm += value;
    }
    return {
      invested,
      mtm,
      unrealized: mtm - invested,
      total: balance + mtm,
    };
  }, [openPositions, pools, balance]);

  if (!ready) return <p className="text-sm text-text-muted">加载持仓…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border-subtle bg-bg-card px-4 py-3">
        <div>
          <p className="text-xs text-text-muted">可用余额</p>
          <p className="score-num text-3xl text-arena-gold">
            {formatBalance(balance)}
            <span className="ml-2 text-sm font-normal text-text-muted">
              积分
            </span>
          </p>
        </div>
        {openPositions.length === 0 ? (
          <p className="text-sm text-text-muted">
            你有{" "}
            <span className="text-arena-gold">{formatBalance(balance)}</span>{" "}
            积分待部署
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="总资产" value={formatBalance(stats.total)} />
        <Stat label="可用余额" value={formatBalance(balance)} gold />
        <Stat label="持仓市值" value={stats.mtm.toFixed(2)} />
        <Stat
          label="未实现盈亏"
          value={stats.unrealized.toFixed(2)}
          tone={stats.unrealized >= 0 ? "green" : "red"}
        />
      </div>

      <section>
        <h3 className="mb-3 font-serif text-xl italic">持仓列表</h3>
        {openPositions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle px-6 py-10 text-center">
            <p className="text-sm text-text-muted">
              尚无持仓。积分闲置不会得分——走进角斗场下第一注。
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link href="/">
                <Button variant="outline">浏览市场</Button>
              </Link>
              <Link href={`/#market-card-${hotMarket}`}>
                <Button>查看热门命题</Button>
              </Link>
            </div>
          </div>
        ) : (
          <PositionTable
            rows={openPositions}
            pools={pools}
            settlementOpen={settlementOpen}
            onSettle={settlePosition}
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-xl italic text-text-muted">已结算</h3>
          <span className="rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text-muted">
            结算状态：
            {settlementOpen
              ? settledPositions.length
                ? "进行中"
                : "已开放 · 等待裁定兑付"
              : "等待比赛结束"}
          </span>
        </div>
        {settledPositions.length === 0 ? (
          <p className="text-sm text-text-muted">
            {settlementOpen
              ? "尚无已兑付仓位。裁定结果后可在持仓表点击 Settle。"
              : "本市场尚未结算，结果将在比赛结束后公布。"}
          </p>
        ) : (
          <PositionTable
            rows={settledPositions}
            pools={pools}
            settlementOpen={settlementOpen}
            onSettle={settlePosition}
            muted
          />
        )}
      </section>

      {settlementOpen ? (
        <Card className="border-arena-gold/20">
          <CardContent className="space-y-4 pt-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-arena-gold">
                赛后裁定
              </p>
              <p className="mt-1 text-sm text-text-muted">
                请裁定五个结果，再于持仓表点击 Settle 兑付
              </p>
            </div>
            <div className="space-y-3">
              {MARKETS.map((m) => {
                if (m.kind === "regular") {
                  const pool = pools.regular_time;
                  return (
                    <ResolveRow
                      key={m.id}
                      title={m.question}
                      resolved={pool.resolved}
                      label={
                        pool.resolution
                          ? {
                              spain: "西班牙胜",
                              draw: "平局",
                              argentina: "阿根廷胜",
                            }[pool.resolution]
                          : null
                      }
                    >
                      {(
                        [
                          ["spain", "西班牙胜"],
                          ["draw", "平局"],
                          ["argentina", "阿根廷胜"],
                        ] as [RegularOutcome, string][]
                      ).map(([oid, label]) => (
                        <Button
                          key={oid}
                          size="sm"
                          variant="outline"
                          disabled={pool.resolved}
                          onClick={() => resolveRegular(oid)}
                        >
                          {label}
                        </Button>
                      ))}
                    </ResolveRow>
                  );
                }
                const pool = pools[m.id];
                return (
                  <ResolveRow
                    key={m.id}
                    title={m.question}
                    resolved={pool.resolved}
                    label={
                      pool.resolution === "yes"
                        ? m.options[0]
                        : pool.resolution === "no"
                          ? m.options[1]
                          : null
                    }
                  >
                    {(
                      [
                        ["yes", m.options[0]],
                        ["no", m.options[1]],
                      ] as [BinarySide, string][]
                    ).map(([side, label]) => (
                      <Button
                        key={side}
                        size="sm"
                        variant={side === "yes" ? "default" : "secondary"}
                        disabled={pool.resolved}
                        onClick={() =>
                          resolveBinary(
                            m.id as Exclude<typeof m.id, "regular_time">,
                            side,
                          )
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </ResolveRow>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isDev ? (
        <div className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
            重置本金（仅开发环境）
          </Button>
          <Dialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            title="重置本金？"
            description="将余额恢复为 10,000 积分，并清空全部持仓与 AMM 池。"
            confirmLabel="确认重置"
            danger
            onConfirm={resetAccount}
          />
        </div>
      ) : null}
    </div>
  );
}

function PositionTable({
  rows,
  pools,
  settlementOpen,
  onSettle,
  muted,
}: {
  rows: ReturnType<typeof useArena>["positions"];
  pools: ReturnType<typeof useArena>["pools"];
  settlementOpen: boolean;
  onSettle: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table
        className={`w-full min-w-[720px] text-left text-sm ${muted ? "opacity-60" : ""}`}
      >
        <thead className="border-b border-border-subtle bg-bg-card text-xs uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">市场</th>
            <th className="px-4 py-3 font-medium">方向</th>
            <th className="px-4 py-3 font-medium">数量</th>
            <th className="px-4 py-3 font-medium">入场价</th>
            <th className="px-4 py-3 font-medium">当前价</th>
            <th className="px-4 py-3 font-medium">盈亏</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pos) => {
            const market = getMarket(pos.marketId);
            const current = markPrice(pos.marketId, String(pos.side), pools);
            const cost = pos.quantity * pos.entryPrice;
            const value = pos.settled
              ? (pos.payout ?? 0)
              : pos.quantity * current;
            const pnl = value - cost;
            const resolved =
              pos.marketId === "regular_time"
                ? pools.regular_time.resolved
                : pools[pos.marketId].resolved;

            return (
              <tr
                key={pos.id}
                className="border-b border-border-subtle/60 last:border-0"
              >
                <td className="px-4 py-3 font-serif text-text-primary">
                  {market?.question ?? pos.marketId}
                </td>
                <td className="px-4 py-3">{pos.label}</td>
                <td className="score-num px-4 py-3 text-lg">{pos.quantity}</td>
                <td className="score-num px-4 py-3 text-text-muted">
                  {(pos.entryPrice * 100).toFixed(1)}¢
                </td>
                <td className="score-num px-4 py-3 text-xl text-arena-gold">
                  {pos.settled
                    ? `${(((pos.payout ?? 0) / pos.quantity) * 100 || 0).toFixed(0)}¢`
                    : `${(current * 100).toFixed(1)}¢`}
                </td>
                <td
                  className={`score-num px-4 py-3 text-lg ${
                    pnl >= 0 ? "text-arena-green" : "text-arena-red"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  {pos.settled ? (
                    <span className="text-xs text-text-muted">已结算</span>
                  ) : !settlementOpen ? (
                    <span className="text-xs text-text-muted">赛后开启</span>
                  ) : resolved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSettle(pos.id)}
                    >
                      Settle
                    </Button>
                  ) : (
                    <span className="text-xs text-text-muted">待裁定</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  gold,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
  gold?: boolean;
}) {
  const color = gold
    ? "text-arena-gold"
    : tone === "green"
      ? "text-arena-green"
      : tone === "red"
        ? "text-arena-red"
        : "text-text-primary";
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className={`score-num mt-1 text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function ResolveRow({
  title,
  resolved,
  label,
  children,
}: {
  title: string;
  resolved: boolean;
  label: string | null;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-subtle p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm text-text-primary">{title}</p>
        <span className="shrink-0 text-xs text-text-muted">
          {resolved ? `已裁定 · ${label}` : "待裁定"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
