"use client";

import { useEffect } from "react";
import { useArena } from "@/lib/store";

export function Toast() {
  const { toast, clearToast } = useArena();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 3200);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-lg border border-arena-gold/40 bg-bg-card px-4 py-3 text-sm text-text-primary shadow-lg">
      {toast}
    </div>
  );
}
