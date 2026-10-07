import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        // Priority pills — single consistent style everywhere (§10)
        p1: "border-transparent bg-[#FEF2F2] text-[#DC2626] dark:bg-red-950 dark:text-red-300",
        p2: "border-transparent bg-[#FFF7ED] text-[#EA580C] dark:bg-orange-950 dark:text-orange-300",
        p3: "border-transparent bg-[#FEFCE8] text-[#A16207] dark:bg-yellow-950 dark:text-yellow-300",
        p4: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-900",
        danger: "border-transparent bg-red-100 text-red-800",
        info: "border-transparent bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function PriorityBadge({
  priority,
}: {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  const map = { CRITICAL: "p1", HIGH: "p2", MEDIUM: "p3", LOW: "p4" } as const;
  const labels = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;
  return <Badge variant={map[priority]}>{labels[priority]}</Badge>;
}

export function StatusBadge({ status, tone }: { status: string; tone?: string }) {
  void tone;
  return <Badge variant="secondary">{status.replaceAll("_", " ")}</Badge>;
}
