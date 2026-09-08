"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import ReportButton from "@/components/ReportButton";
import { POST_FEED_SELECT, enrichPosts } from "@/lib/post-feed";
import type { PostFeedItem, RawFeedPost } from "@/lib/post-feed";
import type { PostComment } from "@/lib/types";

type AuthorInfo = { display_name: string | null; avatar_url: string | null };

type CommentWithAuthor = PostComment & {
  author: AuthorInfo | null;
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

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<PostFeedItem | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: postData, error: postError }, { data: commentsData }] = await Promise.all([
      supabase.from("posts").select(POST_FEED_SELECT).eq("id", postId).single(),
      supabase
        .from("post_comments")
        .select("*, author:users!post_comments_author_id_fkey(display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }),
    ]);

    if (postError || !postData) {
      setError(postError?.message ?? "Beitrag nicht gefunden.");
      setLoading(false);
      return;
    }

    const [enriched] = await enrichPosts([postData as unknown as RawFeedPost], user?.id ?? null);
    setPost(enriched);
    setComments((commentsData ?? []) as unknown as CommentWithAuthor[]);
    setLoading(false);
  }, [postId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCommentSubmit() {
    if (!user || !commentBody.trim()) return;

    setSubmittingComment(true);

    const { error: commentError } = await supabase.from("post_comments").insert({
      post_id: postId,
      author_id: user.id,
      is_anonymous: commentAnonymous,
      body: commentBody.trim(),
    });

    setSubmittingComment(false);

    if (commentError) {
      setError(commentError.message);
      return;
    }

    setCommentBody("");
    setCommentAnonymous(false);
    await loadData();
  }

  function startEditComment(comment: CommentWithAuthor) {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  }

  async function saveEditComment(commentId: string) {
    if (!editingBody.trim()) return;

    await supabase.from("post_comments").update({ body: editingBody.trim() }).eq("id", commentId);

    setEditingCommentId(null);
    setEditingBody("");
    await loadData();
  }

  async function deleteComment(commentId: string) {
    await supabase.from("post_comments").delete().eq("id", commentId);
    await loadData();
  }

  if (authLoading || !user || loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-500 dark:text-zinc-400">Lädt...</p>
    );
  }

  if (error || !post) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">{error ?? "Beitrag nicht gefunden."}</p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-[var(--foreground)] dark:text-zinc-400"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Zurück
      </button>

      <PostCard post={post} />

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {comments.length} {comments.length === 1 ? "Antwort" : "Antworten"}
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Noch keine Antworten. Schreib die erste!
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {comments.map((comment) => {
              const isOwn = comment.author_id === user.id;
              return (
                <li key={comment.id} className="flex gap-2.5">
                  {!comment.is_anonymous && comment.author ? (
                    <Avatar
                      userId={comment.author_id}
                      url={comment.author.avatar_url}
                      name={comment.author.display_name}
                      size={32}
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      ?
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-[var(--foreground)]">
                        {comment.is_anonymous ? (
                          "Anonymer Nutzer"
                        ) : (
                          <Link href={`/u/${comment.author_id}`} className="hover:underline">
                            {comment.author?.display_name ?? "Unbekannt"}
                          </Link>
                        )}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(comment.created_at)}</span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          rows={2}
                          className="w-full rounded-2xl bg-[var(--card)] px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditComment(comment.id)}
                            disabled={!editingBody.trim()}
                            className="rounded-full bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="rounded-full border border-black/10 px-3 py-1 text-xs dark:border-white/15"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-fit max-w-full rounded-2xl bg-[var(--card)] px-3.5 py-2 text-sm">
                        {comment.body}
                      </div>
                    )}

                    <div className="flex items-center gap-3 px-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {isOwn ? (
                        <>
                          <button onClick={() => startEditComment(comment)} className="hover:underline">
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-500 hover:underline"
                          >
                            Löschen
                          </button>
                        </>
                      ) : (
                        <ReportButton
                          targetType="comment"
                          targetId={comment.id}
                          className="text-zinc-500 dark:text-zinc-400"
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 items-center rounded-full bg-[var(--card)] px-4 py-2.5">
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommentSubmit();
                }}
                placeholder="Antworten..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              />
            </div>
            <button
              type="button"
              onClick={handleCommentSubmit}
              disabled={submittingComment || !commentBody.trim()}
              aria-label="Antwort senden"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={17} strokeWidth={1.75} />
            </button>
          </div>
          <label className="flex w-fit items-center gap-1.5 pl-1 text-xs text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={commentAnonymous}
              onChange={(e) => setCommentAnonymous(e.target.checked)}
            />
            Anonym antworten
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
