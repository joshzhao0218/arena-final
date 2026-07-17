"use client";

import { useEffect, useState } from "react";
import { MATCH } from "@/lib/markets";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  live: boolean;
}

function calc(): Parts {
  const diff = Math.max(0, new Date(MATCH.kickoff).getTime() - Date.now());
  if (diff === 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, live: true };
  }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    live: false,
  };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-col items-center rounded-lg border border-border-subtle bg-bg-card px-3 py-2">
      <span className="score-num text-2xl text-arena-gold sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
    </div>
  );
}

export function Countdown() {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    setParts(calc());
    const id = setInterval(() => setParts(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!parts) {
    return <div className="h-16 animate-pulse rounded-lg bg-bg-card" />;
  }

  if (parts.live) {
    return (
      <p className="animate-pulse-gold py-4 text-center font-serif text-xl italic text-arena-red">
        终场哨即将响起 · 市场仍在呼吸
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4">
      <Cell value={parts.days} label="天" />
      <span className="text-arena-gold/50">:</span>
      <Cell value={parts.hours} label="时" />
      <span className="text-arena-gold/50">:</span>
      <Cell value={parts.minutes} label="分" />
      <span className="text-arena-gold/50">:</span>
      <Cell value={parts.seconds} label="秒" />
    </div>
  );
}
