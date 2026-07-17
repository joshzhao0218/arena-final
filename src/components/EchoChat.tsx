"use client";

import { useEffect, useRef, useState } from "react";
import { formatPct, priceYes, regularPrices } from "@/lib/amm";
import { buildEchoFallback, type MarketSnap } from "@/lib/echoLogic";
import { useArena } from "@/lib/store";
import type { EchoMessage } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";

const HISTORY_KEY = "arena_echo_history";

function loadHistory(): EchoMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]",
    ) as EchoMessage[];
    return raw.slice(-6);
  } catch {
    return [];
  }
}

function saveHistory(msgs: EchoMessage[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-6)));
}

export function EchoChat() {
  const { pools, ready } = useArena();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<EchoMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const marketSnapshot = (): MarketSnap | null => {
    if (!ready) return null;
    const champ = priceYes(pools.champion.yesShares, pools.champion.noShares);
    const rt = regularPrices(pools.regular_time);
    const goals = priceYes(pools.goals.yesShares, pools.goals.noShares);
    const pen = priceYes(pools.penalty.yesShares, pools.penalty.noShares);
    const duo = priceYes(pools.duo.yesShares, pools.duo.noShares);
    return {
      champion: {
        argentina: formatPct(champ),
        spain: formatPct(1 - champ),
      },
      regular_time: {
        spain: formatPct(rt.spain),
        draw: formatPct(rt.draw),
        argentina: formatPct(rt.argentina),
      },
      goals_over_2_5: formatPct(goals),
      penalty_yes: formatPct(pen),
      duo_yes: formatPct(duo),
    };
  };

  const send = async () => {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    const nextUser: EchoMessage = { role: "user", content: q };
    const hist: EchoMessage[] = [...messages, nextUser].slice(-6);
    setMessages([...hist, { role: "assistant", content: "" }]);
    setStreaming(true);

    // GitHub Pages 为纯静态站：回声走本地状态机（src/lib/echoLogic）
    const markets = marketSnapshot();
    const reply = buildEchoFallback(q, messages, markets);

    // 轻微延迟，保留对话节奏感
    await new Promise((r) => setTimeout(r, 180));

    const finalMsgs: EchoMessage[] = [
      ...hist,
      { role: "assistant", content: reply } satisfies EchoMessage,
    ].slice(-6);
    setMessages(finalMsgs);
    saveHistory(finalMsgs);
    setStreaming(false);
  };

  return (
    <Card className="border-arena-gold/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden>
              🗣️
            </span>
            <span className="font-serif text-lg italic text-text-primary">
              竞技场回声
            </span>
            <span className="animate-pulse-gold h-2 w-2 rounded-full bg-arena-gold" />
          </div>
          {!open ? (
            <p className="mt-1 text-xs text-text-muted">
              对话往前走 · 答了追问就给数据 · 点击展开
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm text-arena-gold">
          {open ? "▲ 收起" : "▼ 展开对话"}
        </span>
      </button>

      {open ? (
        <CardContent className="border-t border-border-subtle pt-4">
          <div className="mb-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-text-muted">
                完整问题直接答；短词先问清方向。答了方向就给数字。
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`text-sm leading-relaxed ${
                    m.role === "user"
                      ? "text-arena-gold"
                      : "text-text-primary/90"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    {m.role === "user" ? "你" : "回声"}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="例：梅西会不会进球？或先说「市场」"
              disabled={streaming}
            />
            <Button
              onClick={() => void send()}
              disabled={streaming || !input.trim()}
            >
              发送
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
