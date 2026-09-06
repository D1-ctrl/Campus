"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";
import type { Post, PostComment, PollOption } from "@/lib/types";

type AuthorInfo = { display_name: string | null; avatar_url: string | null };

type PostWithMeta = Post & {
  author: AuthorInfo | null;
  subject: { name: string } | null;
  group: { name: string } | null;
  polls: { id: string; poll_options: PollOption[] } | null;
};

type CommentWithAuthor = PostComment & {
  author: AuthorInfo | null;
};

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

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

  const [post, setPost] = useState<PostWithMeta | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: postData, error: postError }, { data: commentsData }] =
      await Promise.all([
        supabase
          .from("posts")
          .select(
            "*, author:users!posts_author_id_fkey(display_name, avatar_url), subject:subjects(name), group:groups(name), polls(id, poll_options(*))"
          )
          .eq("id", postId)
          .single(),
        supabase
          .from("post_comments")
          .select("*, author:users!post_comments_author_id_fkey(display_name, avatar_url)")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);

    if (postError) {
      setError(postError.message);
      setLoading(false);
      return;
    }

    setPost(postData as unknown as PostWithMeta);
    setComments((commentsData ?? []) as unknown as CommentWithAuthor[]);

    const poll = (postData as unknown as PostWithMeta).polls;
    if (poll) {
      const { data: counts } = await supabase.rpc("poll_option_counts", {
        p_poll_id: poll.id,
      });
      const map: Record<string, number> = {};
      (counts ?? []).forEach(
        (c: { option_id: string; vote_count: number }) => {
          map[c.option_id] = c.vote_count;
        }
      );
      setVoteCounts(map);

      if (user) {
        const { data: voteData } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setMyVote(voteData?.option_id ?? null);
      }
    }

    const [{ data: likeCountsData }] = await Promise.all([
      supabase.rpc("post_like_counts", { p_post_ids: [postId] }),
    ]);
    setLikeCount(
      ((likeCountsData ?? []) as { post_id: string; like_count: number }[])[0]?.like_count ?? 0
    );

    setLoading(false);
  }, [postId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle()
      .then(({ data }) => setIsLiked(!!data));

    supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data));
  }, [user, postId]);

  async function toggleBookmark() {
    if (!user) return;

    setBookmarkLoading(true);

    if (isBookmarked) {
      await supabase
        .from("post_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
      setIsBookmarked(false);
    } else {
      await supabase
        .from("post_bookmarks")
        .insert({ user_id: user.id, post_id: postId });
      setIsBookmarked(true);
    }

    setBookmarkLoading(false);
  }

  async function toggleLike() {
    if (!user) return;

    setLikeLoading(true);

    if (isLiked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId);
      setIsLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("post_likes").insert({ user_id: user.id, post_id: postId });
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }

    setLikeLoading(false);
  }

  async function handleVote(optionId: string) {
    const poll = post?.polls;
    if (!user || !poll) return;

    await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: poll.id, option_id: optionId, user_id: user.id },
        { onConflict: "poll_id,user_id" }
      );

    setMyVote(optionId);
    await loadData();
  }

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

    await supabase
      .from("post_comments")
      .update({ body: editingBody.trim() })
      .eq("id", commentId);

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
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Lädt...
      </p>
    );
  }

  if (error || !post) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        {error ?? "Beitrag nicht gefunden."}
      </p>
    );
  }

  const poll = post.polls;
  const totalVotes = poll
    ? poll.poll_options.reduce((sum, o) => sum + (voteCounts[o.id] ?? 0), 0)
    : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Zurück
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            {!post.is_anonymous && post.author && (
              <Avatar
                userId={post.author_id}
                url={post.author.avatar_url}
                name={post.author.display_name}
                size={24}
              />
            )}
            <span>
              {post.is_anonymous ? (
                "Anonymer Nutzer"
              ) : (
                <Link href={`/u/${post.author_id}`} className="font-medium hover:underline">
                  {post.author?.display_name ?? "Unbekannt"}
                </Link>
              )}
            </span>
            {(post.subject || post.group) && (
              <>
                <span>·</span>
                <span>
                  {post.subject ? `🎓 ${post.subject.name}` : `🏷️ ${post.group!.name}`}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{timeAgo(post.created_at)}</span>
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              aria-label={isBookmarked ? "Aus Gespeichert entfernen" : "Beitrag speichern"}
              className="text-base disabled:opacity-50"
            >
              {isBookmarked ? "🔖" : "📑"}
            </button>
          </div>
        </div>
        <p className="text-base">{post.body}</p>
        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            className="max-h-96 w-full rounded-md object-cover"
          />
        )}
      </div>

      {poll && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
          {poll.poll_options
            .sort((a, b) => a.position - b.position)
            .map((option) => {
              const count = voteCounts[option.id] ?? 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const voted = myVote === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  className={`relative overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    voted
                      ? "border-accent"
                      : "border-black/10 hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-black/5 dark:bg-white/10"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span>
                      {voted && "✓ "}
                      {option.label}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {pct}% ({count})
                    </span>
                  </div>
                </button>
              );
            })}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={toggleLike}
        disabled={likeLoading}
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-600 disabled:opacity-50 dark:text-zinc-400"
        aria-label={isLiked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
      >
        <span>{isLiked ? "❤️" : "🤍"}</span>
        {likeCount}
      </button>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          {comments.length} {comments.length === 1 ? "Antwort" : "Antworten"}
        </h2>

        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-black/10 p-3 dark:border-white/15"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  {!comment.is_anonymous && comment.author && (
                    <Avatar
                      userId={comment.author_id}
                      url={comment.author.avatar_url}
                      name={comment.author.display_name}
                      size={20}
                    />
                  )}
                  <span>
                    {comment.is_anonymous ? (
                      "Anonymer Nutzer"
                    ) : (
                      <Link
                        href={`/u/${comment.author_id}`}
                        className="font-medium hover:underline"
                      >
                        {comment.author?.display_name ?? "Unbekannt"}
                      </Link>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{timeAgo(comment.created_at)}</span>
                  {comment.author_id === user.id ? (
                    <>
                      <button
                        onClick={() => startEditComment(comment)}
                        className="hover:underline"
                      >
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
                    <ReportButton targetType="comment" targetId={comment.id} />
                  )}
                </div>
              </div>
              {editingCommentId === comment.id ? (
                <div className="mt-1 flex flex-col gap-2">
                  <textarea
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    rows={2}
                    className={inputClass}
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
                <p className="mt-1 text-sm">{comment.body}</p>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Antworten..."
            rows={2}
            className={inputClass}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={commentAnonymous}
                onChange={(e) => setCommentAnonymous(e.target.checked)}
              />
              Anonym
            </label>
            <button
              onClick={handleCommentSubmit}
              disabled={submittingComment || !commentBody.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {submittingComment ? "Wird gesendet..." : "Antworten"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
