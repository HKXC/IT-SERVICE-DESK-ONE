"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";

export function DashboardShell({
  userName,
  counts,
  children,
}: {
  userName?: string | null;
  counts?: { unassigned?: number; slaRisk?: number };
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] dark:bg-[#0B1220]">
      <Sidebar counts={counts} />
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex">
            <Sidebar
              counts={counts}
              className="flex h-full shadow-2xl"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="m-2 h-9 w-9 shrink-0 bg-background text-foreground shadow"
            >
              <X />
            </Button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
