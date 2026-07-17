"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatBalance } from "@/lib/account";
import { MATCH } from "@/lib/markets";
import { useArena } from "@/lib/store";

export function Nav() {
  const pathname = usePathname();
  const { balance, ready } = useArena();

  const links = [
    { href: "/", label: "市场" },
    { href: "/portfolio", label: "我的持仓" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        <Link
          href="/"
          className="justify-self-start text-sm font-semibold tracking-wide text-arena-gold"
        >
          {MATCH.brand}
        </Link>

        <p className="hidden font-serif text-sm italic text-text-primary sm:block md:text-base">
          {MATCH.titleEn}
        </p>

        <div className="flex items-center justify-end gap-3">
          <span className="hidden score-num text-xs text-text-muted sm:inline">
            可用：
            <span className="ml-1 text-sm text-arena-gold">
              {ready ? formatBalance(balance) : "—"} 积分
            </span>
          </span>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-bg-card text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
