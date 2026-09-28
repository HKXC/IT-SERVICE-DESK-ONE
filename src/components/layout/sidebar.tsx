"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  FilePlus2,
  Monitor,
  Boxes,
  ArrowLeftRight,
  KeyRound,
  BookOpen,
  Users,
  BarChart3,
  ScrollText,
  Settings,
  ChevronDown,
  Inbox,
  Timer,
  CircleAlert,
  Repeat,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Item = { href: string; label: string; icon?: React.ReactNode; badge?: string };

function Group({
  title,
  items,
  defaultOpen = true,
}: {
  title: string;
  items: Item[];
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-3 py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200"
      >
        {title}
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", !open && "-rotate-90")} />
      </button>
      {open && (
        <nav className="mt-0.5 space-y-0.5">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href + "/"));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-[#0D9488]/20 font-semibold text-white shadow-xs"
                    : "text-slate-300/90 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className={cn(active ? "text-[#2DD4BF]" : "text-slate-400")}>{it.icon}</span>
                <span className="flex-1 truncate">{it.label}</span>
                {it.badge && (
                  <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {it.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

const ic = "size-4";

export function Sidebar({ counts, className }: { counts?: { unassigned?: number; slaRisk?: number }; className?: string }) {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/";

  return (
    <aside className={cn("hidden w-64 shrink-0 flex-col bg-[#1E3A5F] lg:flex dark:bg-[#0F1D33]", className)}>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#0D9488] font-bold text-white shadow-sm">
          IT
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">IT Service Desk</p>
          <p className="text-[11px] text-slate-400">Asset Management</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
              isDashboardActive
                ? "bg-[#0D9488]/20 font-semibold text-white shadow-xs"
                : "text-slate-300/90 hover:bg-white/5 hover:text-white"
            )}
          >
            <LayoutDashboard className={cn(ic, isDashboardActive ? "text-[#2DD4BF]" : "text-slate-400")} /> Dashboard
          </Link>
        </div>
        <Group
          title="Service Desk"
          items={[
            { href: "/tickets?filter=mine", label: "My Tickets", icon: <Ticket className={ic} /> },
            { href: "/tickets", label: "All Tickets", icon: <Inbox className={ic} /> },
            {
              href: "/tickets?filter=unassigned",
              label: "Unassigned",
              icon: <CircleAlert className={ic} />,
              badge: counts?.unassigned ? String(counts.unassigned) : undefined,
            },
            {
              href: "/tickets?filter=sla-risk",
              label: "SLA Risk",
              icon: <Timer className={ic} />,
              badge: counts?.slaRisk ? String(counts.slaRisk) : undefined,
            },
            { href: "/tickets?type=INCIDENT", label: "Incidents", icon: <AlertTriangle className={ic} /> },
            { href: "/tickets?type=SERVICE_REQUEST", label: "Service Requests", icon: <FilePlus2 className={ic} /> },
            { href: "/tickets?type=PROBLEM", label: "Problems", icon: <Repeat className={ic} /> },
            { href: "/tickets?type=CHANGE_REQUEST", label: "Changes", icon: <Shuffle className={ic} /> },
          ]}
        />
        <Group
          title="Asset Management"
          items={[
            { href: "/assets", label: "Assets", icon: <Monitor className={ic} /> },
            { href: "/assets/assignments", label: "Asset Assignment", icon: <ArrowLeftRight className={ic} /> },
          ]}
        />
        <Group
          title="Inventory"
          items={[
            { href: "/inventory", label: "Inventory", icon: <Boxes className={ic} /> },
            { href: "/inventory/transactions", label: "Stock Transactions", icon: <ScrollText className={ic} /> },
          ]}
        />
        <Group
          title="Software"
          items={[{ href: "/software", label: "Software & Licenses", icon: <KeyRound className={ic} /> }]}
        />
        <Group
          title="Knowledge"
          items={[{ href: "/knowledge", label: "Knowledge Base", icon: <BookOpen className={ic} /> }]}
        />
        <Group
          title="Management"
          items={[
            { href: "/users", label: "Users", icon: <Users className={ic} /> },
            { href: "/reports", label: "Reports", icon: <BarChart3 className={ic} /> },
            { href: "/audit", label: "Audit Logs", icon: <ScrollText className={ic} /> },
            { href: "/vendors", label: "Vendors & SLA", icon: <Settings className={ic} /> },
          ]}
        />
        <Group
          title="System"
          items={[
            { href: "/settings", label: "Settings", icon: <Settings className={ic} /> },
          ]}
        />
      </div>
      <div className="border-t border-white/10 p-4 text-[11px] text-slate-400">
        v1.0.0 · Production-ready
      </div>
    </aside>
  );
}
