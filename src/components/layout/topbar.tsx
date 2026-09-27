"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Menu, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function Topbar({ userName, onMenu }: { userName?: string | null; onMenu?: () => void }) {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Menu">
        <Menu />
      </Button>
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search tickets, assets, KB…  ( / )"
          className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
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
