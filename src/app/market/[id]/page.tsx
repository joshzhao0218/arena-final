import { MARKETS } from "@/lib/markets";
import { MarketPageClient } from "./MarketPageClient";

export function generateStaticParams() {
  return MARKETS.map((m) => ({ id: m.id }));
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketPageClient id={id} />;
}
