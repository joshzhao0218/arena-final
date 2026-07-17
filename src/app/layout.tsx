import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";
import { ArenaProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://joshzhao0218.github.io/arena-final-20260717";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "竞技场 · 西班牙 vs 阿根廷",
    template: "%s · 竞技场",
  },
  description:
    "2026 世界杯决赛预测市场 — Spain vs Argentina。五道命题、AMM 定价、决赛分析师与回声。",
  applicationName: "竞技场 The Arena",
  keywords: [
    "世界杯决赛",
    "西班牙",
    "阿根廷",
    "预测市场",
    "竞技场",
    "World Cup 2026",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "竞技场 The Arena",
    title: "竞技场 · 西班牙 vs 阿根廷",
    description:
      "只为 2026 决赛而生的预测市场。猜冠军、常规时间、总进球、点球与双骄进球。",
  },
  twitter: {
    card: "summary_large_image",
    title: "竞技场 · 西班牙 vs 阿根廷",
    description: "2026 世界杯决赛单场预测市场",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ArenaProvider>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-border-subtle py-6 text-center text-xs text-text-muted">
            <p>竞技场 · The Arena — Spain vs Argentina · 2026-07-19</p>
            <p className="mt-1 opacity-70">
              预测市场演示 · 非真实博彩 · 不含真实资金结算
            </p>
          </footer>
          <Toast />
        </ArenaProvider>
      </body>
    </html>
  );
}
