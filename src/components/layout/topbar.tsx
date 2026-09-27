"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Menu, Search, LogOut, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

type Notice = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function Topbar({ userName, onMenu }: { userName?: string | null; onMenu?: () => void }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search like global shortcuts do
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function loadNotices() {
    setLoadingNotices(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const j = (await res.json()) as { data: Notice[]; unread: number };
        setNotices(j.data);
        setUnread(j.unread);
      }
    } catch {
      // silent — bell keeps working, badge just stays stale
    } finally {
      setLoadingNotices(false);
    }
  }

  useEffect(() => {
    void loadNotices();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotices((ns) => ns.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation menu">
        <Menu />
      </Button>
      <form
        className="relative hidden max-w-sm flex-1 md:block"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/tickets?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets…  ( / )"
          aria-label="Search tickets"
          className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative" ref={boxRef}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            aria-expanded={open}
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next) void loadNotices();
            }}
          >
            <Bell />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
          {open && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-3">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="flex items-center gap-1 text-xs text-[#0D9488] hover:underline"
                  >
                    <CheckCheck className="size-3.5" aria-hidden /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingNotices ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
                ) : notices.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    You’re all caught up. 🎉
                  </p>
                ) : (
                  notices.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        setOpen(false);
                        if (n.link) router.push(n.link);
                      }}
                      className={`block w-full border-b p-3 text-left text-sm last:border-0 hover:bg-muted/50 ${
                        n.isRead ? "" : "bg-teal-50/60 dark:bg-teal-950/20"
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>
        <div className="ml-1 hidden text-right sm:block">
          <p className="text-sm font-semibold leading-none">{userName ?? "User"}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
