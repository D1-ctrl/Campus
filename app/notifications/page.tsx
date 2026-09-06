"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import type { Notification } from "@/lib/types";

type ActorInfo = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type NotificationItem = Notification & {
  actor: ActorInfo | null;
};

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

function notificationText(n: NotificationItem): string {
  const name = n.actor?.display_name ?? "Jemand";
  if (n.type === "follow") return `${name} folgt dir jetzt.`;
  if (n.type === "like") return `${name} gefällt dein Beitrag.`;
  return `${name} hat auf deinen Beitrag geantwortet.`;
}

function notificationHref(n: NotificationItem): string {
  if ((n.type === "comment" || n.type === "like") && n.post_id) return `/community/${n.post_id}`;
  if (n.actor_id) return `/u/${n.actor_id}`;
  return "#";
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*, actor:users!notifications_actor_id_fkey(id, display_name, avatar_url)")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setItems((data as unknown as NotificationItem[]) ?? []);
    setLoading(false);

    await supabase.rpc("mark_notifications_read");
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || !user) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-6 py-6">
      <h1 className="text-xl font-semibold">Benachrichtigungen</h1>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Benachrichtigungen. Hier siehst du neue Follower und Antworten
          auf deine Beiträge.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[.04] dark:hover:bg-white/10 ${
                !n.read_at ? "bg-accent/5" : ""
              }`}
            >
              {n.actor && (
                <Avatar
                  userId={n.actor.id}
                  url={n.actor.avatar_url}
                  name={n.actor.display_name}
                  size={40}
                />
              )}
              <Link href={notificationHref(n)} className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{notificationText(n)}</span>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {timeAgo(n.created_at)}
                </p>
              </Link>
              {!n.read_at && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
