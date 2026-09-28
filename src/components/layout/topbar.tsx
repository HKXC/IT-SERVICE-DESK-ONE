"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  Menu,
  Search,
  LogOut,
  CheckCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

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
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const themeBoxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // close dropdowns on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (themeBoxRef.current && !themeBoxRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // poll unread count
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.unreadCount === "number") {
          setUnread(data.unreadCount);
        }
      } catch {
        /* noop */
      }
    }
    void check();
    const t = setInterval(() => void check(), 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function loadNotices() {
    setLoadingNotices(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotices(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } finally {
      setLoadingNotices(false);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnread(0);
      setNotices((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* noop */
    }
  }

  async function markOneRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setUnread((c) => Math.max(0, c - 1));
      setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      /* noop */
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:px-6 dark:border-slate-800 dark:bg-[#111A2B]/95">
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-600 hover:text-slate-900 lg:hidden dark:text-slate-300 dark:hover:text-white"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Menu />
      </Button>

      {/* Global Search Bar */}
      <form
        className="relative max-w-md flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim()) return;
          router.push(`/tickets?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets…  ( / )"
          aria-label="Search tickets"
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0D9488] focus:bg-white focus:ring-2 focus:ring-[#0D9488]/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#0B1220]"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications Popover */}
        <div className="relative" ref={boxRef}>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            aria-expanded={open}
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next) void loadNotices();
            }}
          >
            <Bell className="size-4.5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111A2B]">
              <div className="flex items-center justify-between border-b border-slate-100 p-3.5 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="flex items-center gap-1 text-xs font-medium text-[#0D9488] hover:underline dark:text-teal-400"
                  >
                    <CheckCheck className="size-3.5" aria-hidden /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {loadingNotices ? (
                  <p className="p-4 text-center text-sm text-slate-500">Loading…</p>
                ) : notices.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    You’re all caught up. 🎉
                  </p>
                ) : (
                  notices.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) void markOneRead(n.id);
                        setOpen(false);
                        if (n.link) router.push(n.link);
                      }}
                      className={`block w-full p-3.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        n.isRead ? "" : "bg-teal-50/50 dark:bg-teal-950/20"
                      }`}
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                      {n.body && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{n.body}</p>}
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3-State Theme Switcher: Light / Dark / System */}
        <div className="relative" ref={themeBoxRef}>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Switch theme appearance (Light, Dark, System)"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((v) => !v)}
          >
            {mounted ? (
              theme === "dark" ? (
                <Moon className="size-4.5 text-indigo-500 dark:text-indigo-400" />
              ) : theme === "light" ? (
                <Sun className="size-4.5 text-amber-500" />
              ) : (
                <Monitor className="size-4.5 text-slate-500 dark:text-slate-400" />
              )
            ) : (
              <Sun className="size-4.5 text-slate-400" />
            )}
          </Button>

          {themeOpen && (
            <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#111A2B]">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Theme Appearance
              </div>

              {/* Light Option */}
              <button
                type="button"
                onClick={() => {
                  setTheme("light");
                  setThemeOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  mounted && theme === "light"
                    ? "bg-teal-50 font-semibold text-[#0D9488] dark:bg-teal-950/40 dark:text-teal-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <span className="flex items-center gap-2">
                  <Sun className="size-4 text-amber-500" />
                  Light
                </span>
                {mounted && theme === "light" && <Check className="size-3.5 text-[#0D9488] dark:text-teal-400" />}
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => {
                  setTheme("dark");
                  setThemeOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  mounted && theme === "dark"
                    ? "bg-teal-50 font-semibold text-[#0D9488] dark:bg-teal-950/40 dark:text-teal-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <span className="flex items-center gap-2">
                  <Moon className="size-4 text-indigo-500 dark:text-indigo-400" />
                  Dark
                </span>
                {mounted && theme === "dark" && <Check className="size-3.5 text-[#0D9488] dark:text-teal-400" />}
              </button>

              {/* System Option */}
              <button
                type="button"
                onClick={() => {
                  setTheme("system");
                  setThemeOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  mounted && theme === "system"
                    ? "bg-teal-50 font-semibold text-[#0D9488] dark:bg-teal-950/40 dark:text-teal-400"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <span className="flex items-center gap-2">
                  <Monitor className="size-4 text-slate-500 dark:text-slate-400" />
                  System-theme
                </span>
                {mounted && theme === "system" && <Check className="size-3.5 text-[#0D9488] dark:text-teal-400" />}
              </button>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="ml-1 hidden items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-50/80 px-2.5 py-1 sm:flex dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#1E3A5F] text-[10px] font-bold text-white dark:bg-teal-600">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{userName ?? "User"}</p>
        </div>

        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          title="Sign out"
          className="text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4.5" />
        </Button>
      </div>
    </header>
  );
}
