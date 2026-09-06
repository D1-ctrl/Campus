"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import { POST_FEED_SELECT, enrichPosts } from "@/lib/post-feed";
import type { PostFeedItem, RawFeedPost } from "@/lib/post-feed";
import type { Group } from "@/lib/types";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      { data: groupData, error: groupError },
      { count },
      { data: postsData, error: postsError },
    ] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).single(),
      supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("posts")
        .select(POST_FEED_SELECT)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
    ]);

    if (groupError) {
      setError(groupError.message);
      setLoading(false);
      return;
    }

    setGroup(groupData as Group);
    setMemberCount(count ?? 0);

    if (postsError) {
      setError(postsError.message);
    } else {
      const enriched = await enrichPosts(
        (postsData ?? []) as unknown as RawFeedPost[],
        user?.id ?? null
      );
      setPosts(enriched);
    }

    setLoading(false);
  }, [groupId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("group_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("group_id", groupId)
      .maybeSingle()
      .then(({ data }) => setIsMember(!!data));
  }, [user, groupId]);

  async function toggleMembership() {
    if (!user) return;

    setJoining(true);

    if (isMember) {
      await supabase
        .from("group_members")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId);
      setIsMember(false);
      setMemberCount((c) => Math.max(0, c - 1));
    } else {
      await supabase
        .from("group_members")
        .upsert(
          { user_id: user.id, group_id: groupId },
          { onConflict: "group_id,user_id" }
        );
      setIsMember(true);
      setMemberCount((c) => c + 1);
    }

    setJoining(false);
  }

  if (authLoading || !user || loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Lädt...
      </p>
    );
  }

  if (error || !group) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        {error ?? "Gruppe nicht gefunden."}
      </p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link
        href="/groups"
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Zurück zu Gruppen
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {group.description}
            </p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"}
          </p>
        </div>
        <button
          onClick={toggleMembership}
          disabled={joining}
          className={
            isMember
              ? "rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
              : "rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          }
        >
          {isMember ? "Verlassen" : "Beitreten"}
        </button>
      </div>

      <PostComposer
        groupId={group.id}
        placeholder={`Was gibt's Neues in ${group.name}?`}
        onCreated={loadData}
      />

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Beiträge in dieser Gruppe.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
