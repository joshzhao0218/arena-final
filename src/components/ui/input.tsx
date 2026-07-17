import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-arena-gold",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
