"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Bell, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";

export default function TopBar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("unread_message_counts");
    const total = ((data ?? []) as { unread_count: number }[]).reduce(
      (sum, row) => sum + row.unread_count,
      0
    );
    setUnreadCount(total);
  }, [user]);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("unread_notification_count");
    setUnreadNotifications((data as number) ?? 0);
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
    refreshUnreadNotifications();
  }, [refreshUnreadCount, refreshUnreadNotifications, pathname]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dm-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `sender_id=neq.${user.id}`,
        },
        () => refreshUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notification-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => refreshUnreadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshUnreadNotifications]);

  const initial = (profile?.display_name || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="hidden items-center gap-4 border-b border-black/10 px-6 py-3 dark:border-white/10 md:flex">
      <div className="flex flex-1 justify-center">
        <GlobalSearch />
      </div>
      <Link
        href="/upload"
        aria-label="Hochladen"
        title="Hochladen"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90"
      >
        <Plus size={18} strokeWidth={1.75} />
      </Link>
      <Link
        href="/notifications"
        aria-label="Benachrichtigungen"
        title="Benachrichtigungen"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
      >
        <Bell size={17} strokeWidth={1.75} />
        {unreadNotifications > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </Link>
      <Link
        href="/messages"
        aria-label="Nachrichten"
        title="Nachrichten"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
      >
        <MessageCircle size={17} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <ThemeToggle />
      <Link
        href={user ? `/u/${user.id}` : "/login"}
        aria-label="Mein Profil"
        title="Mein Profil"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-black/5 text-sm font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
      >
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-9 w-9 object-cover" />
        ) : (
          initial
        )}
      </Link>
    </header>
  );
}
