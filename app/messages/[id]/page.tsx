"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { DirectMessage } from "@/lib/types";

type ConversationRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string | null;
};

type UserInfo = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [participants, setParticipants] = useState<UserInfo[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .select("id, is_group, name, created_by")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      setError("Konversation nicht gefunden.");
      setLoading(false);
      return;
    }

    const row = conv as ConversationRow;
    setConversation(row);

    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    const otherIds = (participantRows ?? []).map((p) => p.user_id);

    const [{ data: usersData }, { data: messagesData }] = await Promise.all([
      otherIds.length > 0
        ? supabase.from("users").select("id, display_name, avatar_url").in("id", otherIds)
        : Promise.resolve({ data: [] as UserInfo[] }),
      supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    setParticipants((usersData as UserInfo[]) ?? []);
    setMessages((messagesData as DirectMessage[]) ?? []);
    setLoading(false);

    await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
  }, [conversationId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
          if (newMessage.sender_id !== user.id) {
            supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLeaveGroup() {
    if (!user || leaving) return;
    setLeaving(true);
    const { error: leaveError } = await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    setLeaving(false);
    if (leaveError) {
      setError(leaveError.message);
      return;
    }
    router.push("/messages");
  }

  async function handleDeleteGroup() {
    if (!user || leaving) return;
    setLeaving(true);
    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    setLeaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/messages");
  }

  async function handleSend() {
    if (!user || !body.trim() || sending) return;
    setSending(true);

    const { data, error: sendError } = await supabase
      .from("direct_messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body: body.trim() })
      .select()
      .single();

    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    if (data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data as DirectMessage]
      );
    }
    setBody("");
  }

  if (authLoading || !user || loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
    );
  }

  if (error && !conversation) {
    return <p className="px-6 py-10 text-sm text-red-600">{error}</p>;
  }

  const isGroup = conversation?.is_group ?? false;
  const otherUser = !isGroup && participants.length > 0 ? participants[0] : null;
  const title = isGroup
    ? conversation?.name ?? "Gruppenchat"
    : otherUser?.display_name ?? "Unbekannt";
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-6">
      <div className="flex items-center gap-3 border-b border-black/10 pb-3 dark:border-white/15">
        <Link href="/messages" className="text-lg" aria-label="Zurück">
          ←
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-sm font-medium dark:bg-white/10">
          {isGroup ? (
            "🏷️"
          ) : otherUser?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherUser.avatar_url} alt="" className="h-9 w-9 object-cover" />
          ) : (
            (title || "?").charAt(0).toUpperCase()
          )}
        </div>
        {isGroup ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{title}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {participants.map((p) => p.display_name ?? "Unbekannt").join(", ")}
            </p>
          </div>
        ) : (
          otherUser && (
            <Link href={`/u/${otherUser.id}`} className="font-medium hover:underline">
              {title}
            </Link>
          )
        )}
        {isGroup && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Gruppenoptionen"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[.04] dark:hover:bg-white/10"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-black/10 bg-[var(--background)] p-1 text-sm shadow-lg dark:border-white/15">
                <button
                  onClick={handleLeaveGroup}
                  disabled={leaving}
                  className="block w-full rounded px-3 py-1.5 text-left text-red-600 hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/10"
                >
                  Gruppe verlassen
                </button>
                {conversation?.created_by === user.id && (
                  <button
                    onClick={handleDeleteGroup}
                    disabled={leaving}
                    className="block w-full rounded px-3 py-1.5 text-left text-red-600 hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/10"
                  >
                    Chat löschen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Noch keine Nachrichten. Schreib die erste!
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user.id;
            const senderName = isGroup
              ? participantsById.get(m.sender_id)?.display_name ?? "Unbekannt"
              : null;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {senderName && !isMine && (
                  <span className="px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {senderName}
                  </span>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "rounded-br-sm bg-accent text-white"
                      : "rounded-bl-sm bg-black/[.06] dark:bg-white/10"
                  }`}
                >
                  {m.body}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatTime(m.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="pb-2 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2 border-t border-black/10 pt-3 dark:border-white/15">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Nachricht schreiben..."
          className="flex-1 rounded-full border border-black/10 bg-black/[.02] px-4 py-2 text-sm dark:border-white/15 dark:bg-white/5"
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Senden
        </button>
      </div>
    </main>
  );
}
