"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type ConversationRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  last_message_at: string;
};

type UserInfo = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ConversationItem = {
  id: string;
  isGroup: boolean;
  title: string;
  avatarUrl: string | null;
  lastMessage: { body: string; sender_id: string; created_at: string } | null;
  unreadCount: number;
};

type SearchResult = {
  id: string;
  display_name: string | null;
  university: { name: string } | null;
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

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [starting, setStarting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<SearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Map<string, string>>(new Map());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: myParticipantRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    const convIds = (myParticipantRows ?? []).map((r) => r.conversation_id);

    if (convIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const [{ data: convRows }, { data: allParticipants }, { data: messagesData }, { data: unreadData }] =
      await Promise.all([
        supabase
          .from("conversations")
          .select("id, is_group, name, last_message_at")
          .in("id", convIds)
          .order("last_message_at", { ascending: false }),
        supabase
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", convIds)
          .neq("user_id", user.id),
        supabase
          .from("direct_messages")
          .select("conversation_id, body, sender_id, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
        supabase.rpc("unread_message_counts"),
      ]);

    const rows = (convRows ?? []) as ConversationRow[];
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

    const lastMessageByConv = new Map<
      string,
      { body: string; sender_id: string; created_at: string }
    >();
    for (const m of (messagesData ?? []) as {
      conversation_id: string;
      body: string;
      sender_id: string;
      created_at: string;
    }[]) {
      if (!lastMessageByConv.has(m.conversation_id)) {
        lastMessageByConv.set(m.conversation_id, m);
      }
    }

    const unreadByConv = new Map<string, number>(
      ((unreadData ?? []) as { conversation_id: string; unread_count: number }[]).map((u) => [
        u.conversation_id,
        u.unread_count,
      ])
    );

    const items: ConversationItem[] = rows.map((c) => {
      const otherIds = otherByConv.get(c.id) ?? [];
      if (c.is_group) {
        return {
          id: c.id,
          isGroup: true,
          title: c.name ?? "Gruppenchat",
          avatarUrl: null,
          lastMessage: lastMessageByConv.get(c.id) ?? null,
          unreadCount: unreadByConv.get(c.id) ?? 0,
        };
      }
      const other = otherIds.length > 0 ? usersById.get(otherIds[0]) : null;
      return {
        id: c.id,
        isGroup: false,
        title: other?.display_name ?? "Unbekannt",
        avatarUrl: other?.avatar_url ?? null,
        lastMessage: lastMessageByConv.get(c.id) ?? null,
        unreadCount: unreadByConv.get(c.id) ?? 0,
      };
    });

    setConversations(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !user) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, display_name, university:universities(name)")
        .ilike("display_name", `%${trimmed}%`)
        .neq("id", user.id)
        .limit(8);
      setResults((data as unknown as SearchResult[]) ?? []);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  useEffect(() => {
    const trimmed = groupQuery.trim();
    if (trimmed.length < 2 || !user) {
      setGroupResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, display_name, university:universities(name)")
        .ilike("display_name", `%${trimmed}%`)
        .neq("id", user.id)
        .limit(8);
      setGroupResults((data as unknown as SearchResult[]) ?? []);
    }, 300);

    return () => clearTimeout(timeout);
  }, [groupQuery, user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowNewMessage(false);
      }
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setShowNewGroup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function startConversation(otherUserId: string) {
    if (starting) return;
    setStarting(true);
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: otherUserId,
    });
    setStarting(false);
    if (error || !data) return;
    router.push(`/messages/${data}`);
  }

  function toggleMember(person: SearchResult) {
    setSelectedMembers((prev) => {
      const next = new Map(prev);
      if (next.has(person.id)) {
        next.delete(person.id);
      } else {
        next.set(person.id, person.display_name ?? "Unbekannt");
      }
      return next;
    });
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || selectedMembers.size === 0 || creatingGroup) return;
    setCreatingGroup(true);

    const { data, error } = await supabase.rpc("create_group_conversation", {
      p_name: groupName.trim(),
      p_member_ids: Array.from(selectedMembers.keys()),
    });

    setCreatingGroup(false);
    if (error || !data) return;

    setShowNewGroup(false);
    setGroupName("");
    setSelectedMembers(new Map());
    setGroupQuery("");
    router.push(`/messages/${data}`);
  }

  if (authLoading || !user) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nachrichten</h1>
        <div className="flex gap-2">
          <div className="relative" ref={groupRef}>
            <button
              onClick={() => setShowNewGroup((v) => !v)}
              aria-label="Gruppenchat erstellen"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10 md:hidden"
            >
              <Users size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setShowNewGroup((v) => !v)}
              className="hidden rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10 md:block"
            >
              + Gruppenchat
            </button>
            {showNewGroup && (
              <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-md border border-black/10 bg-[var(--background)] p-3 text-sm shadow-lg dark:border-white/15">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Name der Gruppe"
                  className="mb-2 w-full rounded-md border border-black/10 bg-black/[.02] px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
                />
                {selectedMembers.size > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {Array.from(selectedMembers.entries()).map(([id, name]) => (
                      <span
                        key={id}
                        className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  autoFocus
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  placeholder="Mitglieder suchen..."
                  className="w-full rounded-md border border-black/10 bg-black/[.02] px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
                />
                <div className="mt-2 max-h-48 overflow-auto">
                  {groupResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => toggleMember(r)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-black/[.04] dark:hover:bg-white/10"
                    >
                      <span>{r.display_name ?? "Unbekannt"}</span>
                      {selectedMembers.has(r.id) && <span className="text-accent">✓</span>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !groupName.trim() || selectedMembers.size === 0}
                  className="mt-2 w-full rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
                >
                  {creatingGroup ? "Wird erstellt..." : "Gruppenchat erstellen"}
                </button>
              </div>
            )}
          </div>
          <div className="relative" ref={containerRef}>
            <button
              onClick={() => setShowNewMessage((v) => !v)}
              aria-label="Neue Nachricht"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:bg-accent/90 md:hidden"
            >
              <UserPlus size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setShowNewMessage((v) => !v)}
              className="hidden rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 md:block"
            >
              + Neue Nachricht
            </button>
            {showNewMessage && (
              <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-md border border-black/10 bg-[var(--background)] p-3 text-sm shadow-lg dark:border-white/15">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name suchen..."
                  className="w-full rounded-md border border-black/10 bg-black/[.02] px-3 py-1.5 text-sm dark:border-white/15 dark:bg-white/5"
                />
                <div className="mt-2 max-h-64 overflow-auto">
                  {query.trim().length < 2 ? (
                    <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Mindestens 2 Zeichen eingeben.
                    </p>
                  ) : results.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Keine Treffer.
                    </p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => startConversation(r.id)}
                        disabled={starting}
                        className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/10"
                      >
                        <span className="font-medium">{r.display_name ?? "Unbekannt"}</span>
                        {r.university?.name && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.university.name}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Nachrichten. Klicke auf &quot;+ Neue Nachricht&quot;, um jemandem zu
          schreiben.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[.04] dark:hover:bg-white/10"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-sm font-medium dark:bg-white/10">
                {c.isGroup ? (
                  <Users size={18} strokeWidth={1.75} className="text-zinc-400" />
                ) : c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="h-11 w-11 object-cover" />
                ) : (
                  c.title.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{c.title}</p>
                  {c.lastMessage && (
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {timeAgo(c.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {c.lastMessage
                    ? `${c.lastMessage.sender_id === user.id ? "Du: " : ""}${c.lastMessage.body}`
                    : "Noch keine Nachrichten"}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-white">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
