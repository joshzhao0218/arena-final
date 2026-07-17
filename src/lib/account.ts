const BALANCE_KEY = "arena_balance";
const INITIAL = "10000";

function readRaw(): string {
  if (typeof window === "undefined") return INITIAL;
  return localStorage.getItem(BALANCE_KEY) ?? INITIAL;
}

export function getBalance(): number {
  const n = Number(readRaw());
  return Number.isFinite(n) ? n : 10000;
}

export function setBalance(amount: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, Math.round(amount * 100) / 100)));
}

/** 不足返回 false */
export function deductBalance(amount: number): boolean {
  const bal = getBalance();
  if (amount > bal + 1e-9) return false;
  setBalance(bal - amount);
  return true;
}

export function addBalance(amount: number): void {
  setBalance(getBalance() + amount);
}

export function resetAccountBalance(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BALANCE_KEY, INITIAL);
}

export function formatBalance(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
