import { ReceiptText } from "lucide-react";

import { cn } from "@/lib/utils";

// Wordmark for the dark theme: off-white tile with black mark, white wordmark.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-[#f2f2f2] text-[#0d0d0d] shadow-sm">
        <ReceiptText className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg tracking-tight text-foreground">
        Fact<span className="text-muted-foreground">y</span>
      </span>
    </span>
  );
}
