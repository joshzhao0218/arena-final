"use client";

import { useMemo, useState } from "react";
import { formatBalance } from "@/lib/account";
import {
  formatPct,
  priceYes,
  regularPrices,
  tradeCost,
} from "@/lib/amm";
import type { MarketDef } from "@/lib/markets";
import { useArena } from "@/lib/store";
import type { BinaryPool, BinarySide, RegularOutcome } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";

export function TradePanel({ market }: { market: MarketDef }) {
  const { pools, balance, tradeBinary, tradeRegular } = useArena();
  const [qty, setQty] = useState(10);
  const [confirm, setConfirm] = useState<{
    side: BinarySide | RegularOutcome;
    label: string;
    price: number;
  } | null>(null);

  if (market.kind === "regular") {
    const pool = pools.regular_time;
    const prices = regularPrices(pool);
    const options: { id: RegularOutcome; label: string; price: number }[] = [
      { id: "spain", label: market.options[0], price: prices.spain },
      { id: "draw", label: market.options[1], price: prices.draw },
      { id: "argentina", label: market.options[2], price: prices.argentina },
    ];

    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          <Header balance={balance} />
          <QtyInput qty={qty} setQty={setQty} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={pool.resolved}
                onClick={() =>
                  setConfirm({
                    side: opt.id,
                    label: opt.label,
                    price: opt.price,
                  })
                }
                className={`rounded-lg px-4 py-4 text-left text-white transition hover:brightness-110 disabled:opacity-40 ${
                  opt.id === "spain"
                    ? "bg-[#b45309]"
                    : opt.id === "argentina"
                      ? "bg-arena-red"
                      : "bg-[#3a3f46]"
                }`}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="score-num mt-1 block text-2xl font-bold">
                  {(opt.price * 100).toFixed(1)}¢
                </span>
                <span className="mt-1 block text-xs text-white/70">
                  隐含概率 {formatPct(opt.price)} · 成本{" "}
                  {tradeCost(qty, opt.price).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
          <ConfirmDialog
            confirm={confirm}
            qty={qty}
            onClose={() => setConfirm(null)}
            onOk={() => {
              if (!confirm) return;
              tradeRegular(
                confirm.side as RegularOutcome,
                qty,
                confirm.label,
              );
              setConfirm(null);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const pool = pools[market.id] as BinaryPool;
  const yesPrice = priceYes(pool.yesShares, pool.noShares);
  const noPrice = 1 - yesPrice;

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <Header balance={balance} />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">
              YES 价格
            </p>
            <p className="score-num text-5xl text-arena-red">
              {(yesPrice * 100).toFixed(1)}
              <span className="ml-1 text-2xl text-text-muted">¢</span>
            </p>
          </div>
          <QtyInput qty={qty} setQty={setQty} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            disabled={pool.resolved}
            className="h-auto flex-col items-start py-4"
            onClick={() =>
              setConfirm({
                side: "yes",
                label: market.options[0],
                price: yesPrice,
              })
            }
          >
            <span className="text-xs text-white/70">买入 YES</span>
            <span className="text-base font-semibold">{market.options[0]}</span>
            <span className="score-num mt-1 text-sm text-white/80">
              {(yesPrice * 100).toFixed(1)}¢ · 成本{" "}
              {tradeCost(qty, yesPrice).toFixed(2)}
            </span>
          </Button>
          <Button
            variant="secondary"
            disabled={pool.resolved}
            className="h-auto flex-col items-start py-4"
            onClick={() =>
              setConfirm({
                side: "no",
                label: market.options[1],
                price: noPrice,
              })
            }
          >
            <span className="text-xs text-text-muted">买入 NO</span>
            <span className="text-base font-semibold">{market.options[1]}</span>
            <span className="score-num mt-1 text-sm text-text-muted">
              {(noPrice * 100).toFixed(1)}¢ · 成本{" "}
              {tradeCost(qty, noPrice).toFixed(2)}
            </span>
          </Button>
        </div>

        <ConfirmDialog
          confirm={confirm}
          qty={qty}
          onClose={() => setConfirm(null)}
          onOk={() => {
            if (!confirm) return;
            tradeBinary(
              market.id as Exclude<typeof market.id, "regular_time">,
              confirm.side as BinarySide,
              qty,
              confirm.label,
            );
            setConfirm(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function Header({ balance }: { balance: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-arena-gold">交易面板</p>
      <p className="score-num text-sm text-text-muted">
        可用：
        <span className="text-arena-gold">{formatBalance(balance)}</span> 积分
      </p>
    </div>
  );
}

function QtyInput({
  qty,
  setQty,
}: {
  qty: number;
  setQty: (n: number) => void;
}) {
  return (
    <label className="block text-right text-sm text-text-muted">
      数量
      <Input
        type="number"
        min={1}
        step={1}
        value={qty}
        onChange={(e) =>
          setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))
        }
        className="score-num mt-1 w-28 text-lg"
      />
    </label>
  );
}

function ConfirmDialog({
  confirm,
  qty,
  onClose,
  onOk,
}: {
  confirm: { label: string; price: number } | null;
  qty: number;
  onClose: () => void;
  onOk: () => void;
}) {
  const cost = useMemo(
    () => (confirm ? tradeCost(qty, confirm.price) : 0),
    [confirm, qty],
  );

  return (
    <Dialog
      open={!!confirm}
      onOpenChange={(o) => !o && onClose()}
      title="确认下单"
      description={
        confirm
          ? `${confirm.label} · ${qty} 份 · Total Cost = ${cost.toFixed(2)}`
          : undefined
      }
      confirmLabel="Place Trade"
      onConfirm={onOk}
    />
  );
}
