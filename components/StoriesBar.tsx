"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pin, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import type { Story } from "@/lib/types";

type StoryWithAuthor = Story & {
  author: { display_name: string | null; avatar_url: string | null } | null;
};

type AuthorStories = {
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  stories: StoryWithAuthor[];
};

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const [grouped, setGrouped] = useState<AuthorStories[]>([]);
  const [viewing, setViewing] = useState<AuthorStories | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHighlightForm, setShowHighlightForm] = useState(false);
  const [highlightDraft, setHighlightDraft] = useState("");
  const [savingHighlight, setSavingHighlight] = useState(false);

  async function saveAsHighlight(storyId: string) {
    const title = highlightDraft.trim();
    if (!title || savingHighlight) return;
    setSavingHighlight(true);

    const { error } = await supabase
      .from("stories")
      .update({ highlight_title: title })
      .eq("id", storyId);

    if (!error) {
      setViewing((prev) =>
        prev
          ? {
              ...prev,
              stories: prev.stories.map((s) =>
                s.id === storyId ? { ...s, highlight_title: title } : s
              ),
            }
          : prev
      );
      setShowHighlightForm(false);
      setHighlightDraft("");
    }

    setSavingHighlight(false);
  }

  async function loadStories() {
    if (!profile?.university_id) return;

    const { data } = await supabase
      .from("stories")
      .select("*, author:users!stories_author_id_fkey(display_name, avatar_url)")
      .eq("university_id", profile.university_id)
      .order("created_at", { ascending: false });

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const rows = ((data ?? []) as unknown as StoryWithAuthor[]).filter(
      (s) => new Date(s.created_at).getTime() > dayAgo
    );
    const byAuthor = new Map<string, AuthorStories>();

    for (const story of rows) {
      const existing = byAuthor.get(story.author_id);
      if (existing) {
        existing.stories.push(story);
      } else {
        byAuthor.set(story.author_id, {
          authorId: story.author_id,
          authorName: story.author?.display_name ?? "Unbekannt",
          authorAvatarUrl: story.author?.avatar_url ?? null,
          stories: [story],
        });
      }
    }

    setGrouped(Array.from(byAuthor.values()));
  }

  useEffect(() => {
    loadStories();
    // loadStories reads profile.university_id directly; re-running it only
    // needs to be tied to that value, not to a fresh function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.university_id]);

  async function handleCreateStory(file: File | null) {
    if (!file || !user || !profile?.university_id) return;

    setUploading(true);

    const extension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("stories")
      .upload(filePath, file);

    if (!uploadError) {
      const imageUrl = supabase.storage.from("stories").getPublicUrl(filePath).data.publicUrl;
      await supabase.from("stories").insert({
        university_id: profile.university_id,
        author_id: user.id,
        image_url: imageUrl,
      });
      await loadStories();
    }

    setUploading(false);
  }

  if (!user) return null;

  const myStories = grouped.find((g) => g.authorId === user.id);
  const otherStories = grouped.filter((g) => g.authorId !== user.id);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <div className="flex w-16 flex-shrink-0 flex-col items-center gap-1">
        <button
          onClick={() =>
            myStories ? (setViewing(myStories), setViewIndex(0)) : fileInputRef.current?.click()
          }
          disabled={uploading}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-black/10 text-lg disabled:opacity-50 dark:bg-white/10 ${
            myStories ? "ring-2 ring-accent" : ""
          }`}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <span>{(profile?.display_name || "?").charAt(0).toUpperCase()}</span>
          )}
          {!myStories && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
              <Plus size={12} strokeWidth={2.5} />
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => handleCreateStory(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <span className="max-w-16 truncate text-xs text-zinc-600 dark:text-zinc-400">
          Du
        </span>
      </div>

      {otherStories.map((group) => (
        <button
          key={group.authorId}
          onClick={() => {
            setViewing(group);
            setViewIndex(0);
          }}
          className="flex w-16 flex-shrink-0 flex-col items-center gap-1"
        >
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-accent to-pink-500 p-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={group.stories[0].image_url}
              alt=""
              className="h-full w-full rounded-full border-2 border-[var(--background)] object-cover"
            />
          </div>
          <span className="max-w-16 truncate text-xs text-zinc-600 dark:text-zinc-400">
            {group.authorName}
          </span>
        </button>
      ))}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => {
            setViewing(null);
            setShowHighlightForm(false);
          }}
        >
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Avatar
              userId={viewing.authorId}
              url={viewing.authorAvatarUrl}
              name={viewing.authorName}
              size={32}
            />
            <Link
              href={`/u/${viewing.authorId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-white hover:underline"
            >
              {viewing.authorName}
            </Link>
          </div>

          {user?.id === viewing.authorId && !viewing.stories[viewIndex].highlight_title && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHighlightForm((v) => !v);
              }}
              className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              <Pin size={13} strokeWidth={1.75} />
              Als Highlight speichern
            </button>
          )}

          {showHighlightForm && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-4 top-14 flex w-56 flex-col gap-2 rounded-lg bg-[var(--background)] p-3 shadow-lg"
            >
              <input
                type="text"
                value={highlightDraft}
                onChange={(e) => setHighlightDraft(e.target.value)}
                placeholder="Titel, z.B. Uni"
                autoFocus
                className="rounded-md border border-black/10 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
              />
              <button
                onClick={() => saveAsHighlight(viewing.stories[viewIndex].id)}
                disabled={!highlightDraft.trim() || savingHighlight}
                className="w-full rounded-full bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {savingHighlight ? "Speichert..." : "Speichern"}
              </button>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewing.stories[viewIndex].image_url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
          {viewing.stories.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {viewing.stories.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewIndex(i);
                  }}
                  className={`h-1.5 w-6 rounded-full ${
                    i === viewIndex ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
