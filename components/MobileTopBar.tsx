"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Heart, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import NavDrawer from "@/components/NavDrawer";

export default function MobileTopBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("unread_message_counts");
    const total = ((data ?? []) as { unread_count: number }[]).reduce(
      (sum, row) => sum + row.unread_count,
      0
    );
    setUnreadMessages(total);
  }, [user]);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("unread_notification_count");
    setUnreadNotifications((data as number) ?? 0);
  }, [user]);

  useEffect(() => {
    refreshUnreadMessages();
    refreshUnreadNotifications();
  }, [refreshUnreadMessages, refreshUnreadNotifications, pathname]);

  if (!user) return null;

  return (
    <>
      <header className="flex items-center justify-between gap-2 rounded-b-3xl bg-[var(--background)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Menü öffnen"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg hover:bg-black/[.04] dark:hover:bg-white/10"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <Link href="/" className="truncate font-serif text-xl italic font-semibold">
            Campus
          </Link>
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
          <Link href="/notifications" aria-label="Benachrichtigungen" className="relative flex h-8 w-8 items-center justify-center">
            <Heart size={21} strokeWidth={1.75} />
            {unreadNotifications > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Link href="/messages" aria-label="Nachrichten" className="relative flex h-8 w-8 items-center justify-center">
            <Send size={20} strokeWidth={1.75} />
            {unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>
        </div>
      </header>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
