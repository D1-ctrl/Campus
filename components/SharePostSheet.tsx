"use client";

import { useEffect, useState } from "react";
import { Check, Link as LinkIcon, Users, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Target = {
  id: string;
  title: string;
  avatarUrl: string | null;
  isGroup: boolean;
  isSearchResult: boolean;
};

type UserInfo = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type SharePostSheetProps = {
  postId: string;
  onClose: () => void;
};

export default function SharePostSheet({ postId, onClose }: SharePostSheetProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Target[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: myParticipantRows } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      const convIds = (myParticipantRows ?? []).map((r) => r.conversation_id);
      if (convIds.length === 0) {
        setLoading(false);
        return;
      }

      const [{ data: convRows }, { data: allParticipants }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, is_group, name, last_message_at")
          .in("id", convIds)
          .order("last_message_at", { ascending: false })
          .limit(20),
        supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", convIds)
          .neq("user_id", user.id),
      ]);

      const otherByConv = new Map<string, string[]>();
      for (const p of (allParticipants ?? []) as { conversation_id: string; user_id: string }[]) {
        const list = otherByConv.get(p.conversation_id) ?? [];
        list.push(p.user_id);
        otherByConv.set(p.conversation_id, list);
      }

      const allOtherIds = Array.from(new Set((allParticipants ?? []).map((p) => p.user_id)));
      const { data: usersData } =
        allOtherIds.length > 0
          ? await supabase.from("users").select("id, display_name, avatar_url").in("id", allOtherIds)
          : { data: [] as UserInfo[] };
      const usersById = new Map<string, UserInfo>(
        ((usersData ?? []) as UserInfo[]).map((u) => [u.id, u])
      );

      const rows = (convRows ?? []) as { id: string; is_group: boolean; name: string | null }[];
      const items: Target[] = rows.map((c) => {
        if (c.is_group) {
          return {
            id: c.id,
            title: c.name ?? "Gruppenchat",
            avatarUrl: null,
            isGroup: true,
            isSearchResult: false,
          };
        }
        const otherId = (otherByConv.get(c.id) ?? [])[0];
        const other = otherId ? usersById.get(otherId) : null;
        return {
          id: c.id,
          title: other?.display_name ?? "Unbekannt",
          avatarUrl: other?.avatar_url ?? null,
          isGroup: false,
          isSearchResult: false,
        };
      });

      setConversations(items);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !user) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${trimmed}%`)
        .neq("id", user.id)
        .limit(8);

      setSearchResults(
        ((data ?? []) as UserInfo[]).map((u) => ({
          id: u.id,
          title: u.display_name ?? "Unbekannt",
          avatarUrl: u.avatar_url,
          isGroup: false,
          isSearchResult: true,
        }))
      );
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  async function sendToConversation(conversationId: string) {
    if (!user || sendingId) return;
    setSendingId(conversationId);

    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: "",
      shared_post_id: postId,
    });

    setSendingId(null);
    setSentIds((prev) => new Set(prev).add(conversationId));
  }

  async function sendToUser(otherUserId: string) {
    if (!user || sendingId) return;
    setSendingId(otherUserId);

    const { data: conversationId, error } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: otherUserId,
    });

    if (error || !conversationId) {
      setSendingId(null);
      return;
    }

    await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: "",
      shared_post_id: postId,
    });

    setSendingId(null);
    setSentIds((prev) => new Set(prev).add(otherUserId));
  }

  async function copyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/community/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  const showSearch = query.trim().length >= 2;
  const list = showSearch ? searchResults : conversations;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-[var(--background)] p-4 sm:max-w-sm sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Beitrag senden</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-zinc-500 dark:text-zinc-400"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={copyLink}
          className="mb-3 flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
        >
          <LinkIcon size={16} strokeWidth={1.75} />
          {linkCopied ? "Link kopiert!" : "Link kopieren"}
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nach Person suchen..."
          className="mb-2 w-full rounded-full border border-black/10 bg-black/[.02] px-4 py-2 text-sm dark:border-white/15 dark:bg-white/5"
        />

        <div className="flex-1 overflow-y-auto">
          {loading && !showSearch ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Lädt...</p>
          ) : list.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {showSearch ? "Keine Treffer." : "Noch keine Chats. Suche nach jemandem."}
            </p>
          ) : (
            list.map((item) => {
              const sent = sentIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={sendingId === item.id || sent}
                  onClick={() =>
                    item.isSearchResult ? sendToUser(item.id) : sendToConversation(item.id)
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-black/[.04] disabled:opacity-70 dark:hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-sm font-medium dark:bg-white/10">
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatarUrl} alt="" className="h-10 w-10 object-cover" />
                    ) : item.isGroup ? (
                      <Users size={16} strokeWidth={1.75} className="text-zinc-400" />
                    ) : (
                      item.title.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
                  {sent ? (
                    <Check size={18} strokeWidth={2} className="text-accent" />
                  ) : (
                    <span className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15">
                      {sendingId === item.id ? "..." : "Senden"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
