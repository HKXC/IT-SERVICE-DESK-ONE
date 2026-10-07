"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };
type NavGroup = { label: string; paths: string[]; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Service Desk",
    paths: ["/tickets"],
    items: [
      { label: "All tickets", href: "/tickets" },
      { label: "My tickets", href: "/tickets?filter=mine" },
      { label: "Unassigned", href: "/tickets?filter=unassigned" },
      { label: "SLA risk", href: "/tickets?filter=sla-risk" },
      { label: "New ticket", href: "/tickets/new" },
    ],
  },
  {
    label: "Assets",
    paths: ["/assets"],
    items: [
      { label: "All assets", href: "/assets" },
      { label: "Assignments", href: "/assets/assignments" },
      { label: "New asset", href: "/assets/new" },
    ],
  },
  {
    label: "Manage",
    paths: ["/users", "/reports", "/settings"],
    items: [
      { label: "Users", href: "/users" },
      { label: "Reports", href: "/reports" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav ref={navRef} aria-label="Main navigation" className="hidden h-full items-center gap-1 xl:flex">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={cn("rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", pathname === "/" ? "text-foreground" : "text-muted-foreground")}
      >
        Dashboard
      </Link>
      {groups.map((group, index) => {
        const active = group.paths.some((path) => pathname === path || pathname.startsWith(path + "/"));
        const expanded = open === group.label;
        return (
          <div key={group.label} className="relative flex h-full items-center">
            {index === groups.length - 1 && <span aria-hidden className="mx-2 h-5 w-px bg-border" />}
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`nav-${group.label.toLowerCase().replaceAll(" ", "-")}`}
              onClick={() => setOpen(expanded ? null : group.label)}
              className={cn("rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", active || expanded ? "text-foreground" : "text-muted-foreground")}
            >
              {group.label}
            </button>
            {expanded && (
              <div id={`nav-${group.label.toLowerCase().replaceAll(" ", "-")}`} className="absolute left-0 top-[calc(100%-2px)] z-50 min-w-48 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(null)} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
