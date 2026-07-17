export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "#fbbf24",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 0.01;
  const pad = 2;
  const points = data
    .map((v, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
