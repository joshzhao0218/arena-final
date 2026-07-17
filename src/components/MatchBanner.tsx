import { MATCH } from "@/lib/markets";

export function MatchBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="text-center">
      <p className="mb-1 text-xs uppercase tracking-[0.25em] text-text-muted">
        World Cup Final 2026 · {MATCH.venue}
      </p>
      <h1
        className={`font-serif italic text-text-primary ${
          compact ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl md:text-6xl"
        }`}
      >
        {MATCH.titleEn}
      </h1>
      <p className="mt-2 text-sm text-text-muted">{MATCH.titleZh}</p>
    </div>
  );
}
