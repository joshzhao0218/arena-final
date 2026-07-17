"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  danger,
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal
        className={cn(
          "w-full max-w-sm rounded-lg border border-border-subtle bg-bg-card p-6 shadow-2xl",
        )}
      >
        <h3 className="font-serif text-xl italic text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-text-muted">{description}</p>
        ) : null}
        {children}
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button
              variant={danger ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
