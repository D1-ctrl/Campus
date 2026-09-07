"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, GraduationCap, Tag, MoreHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import ReportButton from "@/components/ReportButton";
import SharePostSheet from "@/components/SharePostSheet";
import type { PostFeedItem } from "@/lib/post-feed";

type PostCardProps = {
  post: PostFeedItem;
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

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [liking, setLiking] = useState(false);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [saving, setSaving] = useState(false);
  const [voteCounts, setVoteCounts] = useState(post.poll_vote_counts);
  const [myVote, setMyVote] = useState(post.my_poll_vote);
  const [voting, setVoting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function toggleLike() {
    if (!user || liking) return;
    setLiking(true);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }

    setLiking(false);
  }

  async function toggleSave() {
    if (!user || saving) return;
    setSaving(true);

    if (saved) {
      setSaved(false);
      await supabase.from("post_bookmarks").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setSaved(true);
      await supabase.from("post_bookmarks").insert({ post_id: post.id, user_id: user.id });
    }

    setSaving(false);
  }

  async function deletePost() {
    if (!user || user.id !== post.author_id) return;
    setMenuOpen(false);
    await supabase.from("posts").delete().eq("id", post.id);
    setDeleted(true);
  }

  async function vote(optionId: string) {
    if (!user || !post.poll || voting || myVote === optionId) return;
    setVoting(true);

    const previousVote = myVote;
    setMyVote(optionId);
    setVoteCounts((prev) => {
      const next = { ...prev };
      if (previousVote) next[previousVote] = Math.max(0, (next[previousVote] ?? 0) - 1);
      next[optionId] = (next[optionId] ?? 0) + 1;
      return next;
    });

    await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: post.poll.id, option_id: optionId, user_id: user.id },
        { onConflict: "poll_id,user_id" }
      );

    setVoting(false);
  }

  if (deleted) return null;

  const totalVotes = post.poll
    ? post.poll.poll_options.reduce((sum, o) => sum + (voteCounts[o.id] ?? 0), 0)
    : 0;

  const ContextIcon = post.subject ? GraduationCap : post.group ? Tag : null;
  const contextLabel = post.subject?.name ?? post.group?.name ?? null;
  const contextHref = post.subject_id
    ? `/subjects/${post.subject_id}`
    : post.group_id
      ? `/groups/${post.group_id}`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {!post.is_anonymous && post.author && (
            <Avatar
              userId={post.author_id}
              url={post.author.avatar_url}
              name={post.author.display_name}
              size={38}
            />
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">
              {post.is_anonymous ? (
                "Anonymer Nutzer"
              ) : (
                <Link
                  href={`/u/${post.author_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {post.author?.display_name ?? "Unbekannt"}
                </Link>
              )}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              {contextLabel && ContextIcon && (
                <>
                  <ContextIcon size={11} strokeWidth={1.75} />
                  {contextHref ? (
                    <Link
                      href={contextHref}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {contextLabel}
                    </Link>
                  ) : (
                    contextLabel
                  )}
                  <span>·</span>
                </>
              )}
              {timeAgo(post.created_at)}
            </span>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Optionen"
            className="flex h-8 w-8 items-center justify-center text-zinc-500 dark:text-zinc-400"
          >
            <MoreHorizontal size={18} strokeWidth={1.75} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-black/10 bg-[var(--background)] py-1 text-sm shadow-lg dark:border-white/15">
              {user?.id === post.author_id ? (
                <button
                  onClick={deletePost}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-500 hover:bg-black/[.04] dark:hover:bg-white/10"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  Beitrag löschen
                </button>
              ) : (
                <div className="px-3 py-2">
                  <ReportButton
                    targetType="post"
                    targetId={post.id}
                    className="text-zinc-500 dark:text-zinc-400"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-hidden rounded-2xl bg-[var(--card)]">
        <Link href={`/community/${post.id}`} className="flex flex-col gap-2">
          {post.body && (
            <p className={`text-sm ${post.image_url ? "px-4 pt-4" : "p-4"}`}>{post.body}</p>
          )}
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className="max-h-[32rem] w-full object-cover"
            />
          )}
        </Link>

        {post.poll && (
          <div className={`flex flex-col gap-1.5 px-4 pb-4 ${post.image_url || post.body ? "" : "pt-4"}`}>
            {post.poll.poll_options
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((option) => {
                const count = voteCounts[option.id] ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const voted = myVote === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => vote(option.id)}
                    disabled={voting}
                    className={`relative overflow-hidden rounded-md border px-3 py-1.5 text-left text-xs transition-colors disabled:opacity-70 ${
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
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={toggleLike}
            disabled={!user || liking}
            className="flex items-center gap-1.5 disabled:opacity-50"
            aria-label={liked ? "Gefällt mir nicht mehr" : "Gefällt mir"}
          >
            <Heart size={21} strokeWidth={1.75} className={liked ? "fill-red-500 text-red-500" : ""} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{likeCount}</span>
          </button>
          <Link
            href={`/community/${post.id}`}
            className="flex items-center gap-1.5"
            aria-label="Kommentare"
          >
            <MessageCircle size={21} strokeWidth={1.75} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{post.comment_count}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5"
            aria-label="Senden"
          >
            <Send size={19} strokeWidth={1.75} />
          </button>
        </div>
        <button
          type="button"
          onClick={toggleSave}
          disabled={!user || saving}
          aria-label={saved ? "Aus Gespeichert entfernen" : "Speichern"}
          className="disabled:opacity-50"
        >
          <Bookmark size={20} strokeWidth={1.75} className={saved ? "fill-current" : ""} />
        </button>
      </div>

      {shareOpen && <SharePostSheet postId={post.id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
