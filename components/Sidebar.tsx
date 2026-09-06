"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import NavDrawer, { RAIL_ITEMS } from "@/components/NavDrawer";

export default function Sidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-16 flex-shrink-0 flex-col items-center gap-2 border-r border-black/10 py-4 dark:border-white/10 md:flex">
        <Link
          href="/"
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
        >
          S
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Menü öffnen"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/[.04] dark:hover:bg-white/10"
        >
          <Menu size={19} strokeWidth={1.75} />
        </button>
        <div className="my-1 w-8 border-t border-black/10 dark:border-white/10" />
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                active
                  ? "bg-accent/10 text-accent"
                  : "hover:bg-black/[.04] dark:hover:bg-white/10"
              }`}
            >
              <Icon size={19} strokeWidth={1.75} />
            </Link>
          );
        })}
      </aside>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
