"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { AmbientLayer } from "@/components/motion/ambient-layer";
import { PageTransition } from "@/components/motion/page-transition";
import { getMotionScope } from "@/lib/motion-scope";

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
  const pathname = usePathname();
  const motionScope = getMotionScope(pathname);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  // lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div
      data-motion-scope={motionScope}
      className="relative flex min-h-screen bg-[#f6f7f3] dark:bg-[#080d0c]"
    >
      <AmbientLayer scope={motionScope} />
      {menuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
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
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-8">
          <PageTransition enabled={motionScope === "high" || motionScope === "medium"}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
