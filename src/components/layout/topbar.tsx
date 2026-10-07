"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, Search, LogOut, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { DesktopNav } from "@/components/layout/desktop-nav";

export function Topbar({ userName, onMenu }: { userName?: string | null; onMenu?: () => void }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses search like global shortcuts do
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-xl xl:px-8">
      <Button variant="ghost" size="icon" className="xl:hidden" onClick={onMenu} aria-label="Open navigation menu">
        <Menu />
      </Button>
      <Link href="/" className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground" aria-label="IT Helpdesk dashboard">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#a9c395] text-[#0b1110]"><Layers3 className="size-4" aria-hidden /></span>
        <span className="hidden sm:inline">IT Helpdesk<span className="text-[#a9c395]">.</span></span>
      </Link>
      <div className="mx-auto hidden xl:block"><DesktopNav /></div>
      <form
        className={`absolute right-4 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border bg-card p-2 shadow-xl ${searchOpen ? "block" : "hidden"}`}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchOpen(false);
          router.push(`/tickets?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickets…  ( / )"
          aria-label="Search tickets"
          className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Search tickets" aria-expanded={searchOpen} onClick={() => setSearchOpen((value) => !value)}>
          <Search />
        </Button>
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
