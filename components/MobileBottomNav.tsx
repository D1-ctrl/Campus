"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Suche", icon: Search },
] as const;

export default function MobileBottomNav() {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const profileHref = `/u/${user.id}`;
  const initial = (profile?.display_name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-[var(--background)]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              active ? "text-accent" : "text-zinc-400"
            }`}
          >
            <Icon size={22} strokeWidth={1.75} />
          </Link>
        );
      })}

      <Link
        href="/upload"
        aria-label="Beitrag erstellen"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg"
      >
        <Plus size={24} strokeWidth={2} />
      </Link>

      <Link
        href="/dashboard"
        aria-label="Kalender"
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          pathname === "/dashboard" ? "text-accent" : "text-zinc-400"
        }`}
      >
        <CalendarDays size={22} strokeWidth={1.75} />
      </Link>

      <Link
        href={profileHref}
        aria-label="Profil"
        className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-medium ${
          pathname === profileHref ? "ring-2 ring-accent" : ""
        } bg-black/10 dark:bg-white/10`}
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </Link>
    </nav>
  );
}
