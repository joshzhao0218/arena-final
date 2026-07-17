"use client";

import { useMemo, useState } from "react";
import { formatBalance } from "@/lib/account";
import { formatPct, tradeCost } from "@/lib/amm";
import type { MarketDef } from "@/lib/markets";
import { useArena } from "@/lib/store";
import { useMarketTicker } from "@/lib/useMarketTicker";
import type { BinarySide, RegularOutcome } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";

export function TradePanel({ market }: { market: MarketDef }) {
  const { pools, balance, tradeBinary, tradeRegular } = useArena();
  const { getPrice, getRow, syncFromPools } = useMarketTicker();
  const [qty, setQty] = useState(0);
  const [selected, setSelected] = useState<{
    side: BinarySide | RegularOutcome;
    label: string;
    optionIndex: number;
  } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const livePrice = selected
    ? getPrice(market.id, selected.optionIndex)
    : getPrice(market.id, 0);
  const cost = useMemo(
    () => (qty > 0 ? tradeCost(qty, livePrice) : 0),
    [qty, livePrice],
  );
  const insufficient = qty > 0 && cost > balance + 1e-9;
  const resolved =
    market.kind === "regular"
      ? pools.regular_time.resolved
      : pools[market.id].resolved;

  const place = () => {
    if (!selected || qty < 1 || insufficient || resolved) return;
    let ok = false;
    if (market.kind === "regular") {
      ok = tradeRegular(
        selected.side as RegularOutcome,
        qty,
        selected.label,
      );
    } else {
      ok = tradeBinary(
        market.id as Exclude<typeof market.id, "regular_time">,
        selected.side as BinarySide,
        qty,
        selected.label,
      );
    }
    if (ok) {
      syncFromPools();
      setConfirm(false);
      setQty(0);
    }
  };

  if (market.kind === "regular") {
    const options: { id: RegularOutcome; label: string; index: number }[] = [
      { id: "spain", label: market.options[0], index: 0 },
      { id: "draw", label: market.options[1], index: 1 },
      { id: "argentina", label: market.options[2], index: 2 },
    ];

    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          <Header balance={balance} />
          <QtyControls
            qty={qty}
            setQty={setQty}
            insufficient={insufficient}
          />
          <PnlSimulator
            qty={qty}
            price={livePrice}
            cost={cost}
            hasSelection={!!selected}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {options.map((opt) => {
              const row = getRow(market.id, opt.index);
              const price = row?.price ?? 0.33;
              const active = selected?.side === opt.id;
              const bg =
                opt.id === "spain"
                  ? "#b45309"
                  : opt.id === "argentina"
                    ? "#dc2626"
                    : "#3a3f46";
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={resolved}
                  onClick={() =>
                    setSelected({
                      side: opt.id,
                      label: opt.label,
                      optionIndex: opt.index,
                    })
                  }
                  style={{ background: bg }}
                  className={`rounded-lg px-4 py-4 text-left text-white transition hover:brightness-110 disabled:opacity-40 ${
                    active ? "ring-2 ring-arena-gold" : ""
                  }`}
                >
                  <span className="block text-sm font-semibold">{opt.label}</span>
                  <span className="score-num mt-1 block text-2xl font-bold">
                    {(price * 100).toFixed(1)}¢
                    {row?.direction === "up" ? (
                      <span className="ml-1 text-sm">▲</span>
                    ) : row?.direction === "down" ? (
                      <span className="ml-1 text-sm opacity-70">▼</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-white/70">
                    隐含概率 {formatPct(price)}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            className="w-full"
            disabled={!selected || qty < 1 || insufficient || resolved}
            onClick={() => setConfirm(true)}
          >
            Place Trade
          </Button>
          <ConfirmDialog
            open={confirm}
            label={selected?.label ?? ""}
            qty={qty}
            cost={cost}
            onClose={() => setConfirm(false)}
            onOk={place}
          />
        </CardContent>
      </Card>
    );
  }

  const yesPrice = getPrice(market.id, 0);
  const noPrice = getPrice(market.id, 1);
  const yesRow = getRow(market.id, 0);

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <Header balance={balance} />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-muted">
              YES 价格 · 呼吸中
            </p>
            <p
              className={`score-num text-5xl ${
                yesRow?.direction === "down"
                  ? "text-text-muted"
                  : "text-arena-red"
              }`}
            >
              {(yesPrice * 100).toFixed(1)}
              <span className="ml-1 text-2xl text-text-muted">¢</span>
              {yesRow?.direction === "up" ? (
                <span className="ml-2 text-xl text-arena-gold">▲</span>
              ) : yesRow?.direction === "down" ? (
                <span className="ml-2 text-xl text-text-muted">▼</span>
              ) : null}
            </p>
          </div>
          <QtyControls qty={qty} setQty={setQty} insufficient={insufficient} />
        </div>

        <PnlSimulator
          qty={qty}
          price={livePrice}
          cost={cost}
          hasSelection={!!selected}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button
            disabled={resolved}
            className={`h-auto flex-col items-start py-4 ${
              selected?.side === "yes" ? "ring-2 ring-arena-gold" : ""
            }`}
            onClick={() =>
              setSelected({
                side: "yes",
                label: market.options[0],
                optionIndex: 0,
              })
            }
          >
            <span className="text-xs text-white/70">买入 YES</span>
            <span className="text-base font-semibold">{market.options[0]}</span>
            <span className="score-num mt-1 text-sm text-white/80">
              {(yesPrice * 100).toFixed(1)}¢
            </span>
          </Button>
          <Button
            variant="secondary"
            disabled={resolved}
            className={`h-auto flex-col items-start py-4 ${
              selected?.side === "no" ? "ring-2 ring-arena-gold" : ""
            }`}
            onClick={() =>
              setSelected({
                side: "no",
                label: market.options[1],
                optionIndex: 1,
              })
            }
          >
            <span className="text-xs text-text-muted">买入 NO</span>
            <span className="text-base font-semibold">{market.options[1]}</span>
            <span className="score-num mt-1 text-sm text-text-muted">
              {(noPrice * 100).toFixed(1)}¢
            </span>
          </Button>
        </div>

        <Button
          className="w-full"
          disabled={!selected || qty < 1 || insufficient || resolved}
          onClick={() => setConfirm(true)}
        >
          Place Trade
        </Button>
        <ConfirmDialog
          open={confirm}
          label={selected?.label ?? ""}
          qty={qty}
          cost={cost}
          onClose={() => setConfirm(false)}
          onOk={place}
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

function QtyControls({
  qty,
  setQty,
  insufficient,
}: {
  qty: number;
  setQty: (n: number) => void;
  insufficient: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-sm text-text-muted">数量</p>
      <div className="mt-1 flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setQty(Math.max(0, qty - 10))}
        >
          -10
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setQty(Math.max(0, qty - 50))}
        >
          -50
        </Button>
        <Input
          type="number"
          min={0}
          step={1}
          value={qty}
          onChange={(e) =>
            setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
          className={`score-num w-24 text-center text-lg ${
            insufficient ? "border-arena-red" : ""
          }`}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setQty(qty + 10)}
        >
          +10
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setQty(qty + 50)}
        >
          +50
        </Button>
      </div>
      {insufficient ? (
        <p className="mt-1 text-xs text-arena-red">余额不足</p>
      ) : null}
    </div>
  );
}

function PnlSimulator({
  qty,
  price,
  cost,
  hasSelection,
}: {
  qty: number;
  price: number;
  cost: number;
  hasSelection: boolean;
}) {
  const shell = {
    background: "#1a1d20",
  } as const;

  if (qty <= 0) {
    return (
      <div
        className="rounded-lg px-4 py-3 font-mono text-sm text-text-primary"
        style={shell}
      >
        调整数量以预览盈亏
      </div>
    );
  }

  const payout = qty;
  const net = payout - cost;
  const priceLabel = (price * 100).toFixed(1);

  return (
    <div
      className="space-y-1.5 rounded-lg px-4 py-3 font-mono text-sm text-text-primary"
      style={shell}
    >
      <p>
        投入：
        <span className="text-arena-gold">{qty}</span> 股
        {!hasSelection ? (
          <span className="ml-2 text-xs text-text-muted">（先选方向）</span>
        ) : null}
      </p>
      <p>
        成本：
        <span className="text-arena-gold">{cost.toFixed(2)}</span> 积分
        <span className="ml-2 text-xs text-text-muted">
          {"价格 "}
          {priceLabel}
          {"¢"}
        </span>
      </p>
      <p>
        若正确 → 得{" "}
        <span className="text-arena-gold">{payout.toFixed(0)}</span> 积分，净赚{" "}
        <span className="text-arena-gold">{net.toFixed(2)}</span> 积分
      </p>
      <p>
        若错误 → 损失{" "}
        <span className="text-arena-red">{cost.toFixed(2)}</span> 积分
      </p>
    </div>
  );
}

function ConfirmDialog({
  open,
  label,
  qty,
  cost,
  onClose,
  onOk,
}: {
  open: boolean;
  label: string;
  qty: number;
  cost: number;
  onClose: () => void;
  onOk: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="确认下单"
      description={`${label} · ${qty} 份 · Total Cost = ${cost.toFixed(2)}`}
      confirmLabel="Place Trade"
      onConfirm={onOk}
    />
  );
}
